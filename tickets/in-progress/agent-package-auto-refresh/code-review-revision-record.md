# Code Review Revision Record — `agent-package-auto-refresh`

The latest `code-review-report.md` (or `api-e2e-test-review-report.md`) remains authoritative for its current result.

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | Implementation Review / IR-001 implementation complete | N/A | Fail (Local Fix) | CR-001, CR-002, CR-003 |
| CRR-002 | `code-review-report.md` | Implementation Review round 2 / IR-002 local fixes | Fail (Local Fix) | Pass | CR-001, CR-002, CR-003 resolved |
| CRR-003 | `code-review-report.md` | API/E2E Failure-Origin Review / API-REV-001 APE-001 | Pass | Fail (Design Impact) | CR-004 (new) |
| CRR-004 | `code-review-report.md` | Implementation Review round 4 / IR-003 (SR-008) | Fail (Design Impact) | Pass | CR-004 resolved |
| CRR-005 | `api-e2e-test-review-report.md` | Proportional API/E2E test-code review / API-REV-002 Pass | Pass (CRR-004) | Pass | None |

## Revision Entries

### CRR-001 — Initial source review: unreadable root blocks the catalog; two small web fixes

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/code-review-report.md`
- Review entry point and round: Implementation Review, round 1
- Review scope: `Full Review`
- Triggering role, report path, and finding or scenario IDs: `/software_engineering_team/implementation_engineer`, `implementation-handoff.md` (IR-001)
- Relevant solution revision IDs: SR-005, SR-007
- Relevant architecture-review revision IDs: ARCH-REV-002
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A
- Current authoritative result: `Fail` — Local Fix
- What changed in the review result and why:
  - Baseline established.
  - The catalog, sync, readers, monitor, services, admission (N-1…N-4), feed and web stores implement the reviewed design faithfully. Catalog unit and journey integration tests were rerun and pass (6 files, 81 tests).
  - CR-001: one unreadable registered folder fails every catalog read and the startup admission scan. Reproduced by a reviewer probe (temporary test, removed). The base code tolerated this case.
  - CR-002: the diagnostics store can miss a change that arrives during an in-flight load.
  - CR-003: test-only alias in `projectChangeFeed.ts`.
- Supported product scenario / material-premise basis changes: new premise CR-P-01 (present but unreadable registered root; REQ-015) — Reachable, Supported Explicit Edge. C-04…C-07 rejected.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: CR-001 (High), CR-002 (Low), CR-003 (Low); non-blocking R-1.
- Material score or classification changes: baseline 9.0/10. Runtime Correctness 7.5, API/E2E Readiness 8.8 and Cleanup 8.8 are below the bar. Task size Large / architectural risk High confirmed.
- Recommended recipient: `/software_engineering_team/implementation_engineer`
- Remaining risks or uncertainty: remote-access auth on the new websocket, the desktop journey, AC-008/009/010/014 and Linux Vitest execution remain for API/E2E.

### CRR-002 — IR-002 resolves CR-001…CR-003; Pass

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/code-review-report.md`
- Review entry point and round: Implementation Review, round 2
- Review scope: `Full Re-Audit`. The delta changes the DS-002 spine owner (`definition-catalog-sync.ts`) plus the monitor and studio startup. All structural checks and the full scorecard were rerun; evidence for untouched files is carried forward.
- Triggering role, report path, and finding or scenario IDs: `/software_engineering_team/implementation_engineer`, `implementation-handoff.md` / `implementation-revision-record.md` IR-002 (`3cc17135f`); CR-001, CR-002, CR-003, R-1
- Relevant solution revision IDs: SR-005, SR-007
- Relevant architecture-review revision IDs: ARCH-REV-002
- Relevant implementation revision IDs: IR-001, IR-002
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: `Fail` (Local Fix), CRR-001
- Current authoritative result: `Pass`
- What changed in the review result and why: all three findings were verified as resolved in code. Reruns:
  - catalog unit plus journey integration: 7 files, 86 tests pass;
  - server typecheck: clean;
  - affected web specs: 5 files, 18 tests pass.

  R-1 was adopted. New non-blocking R-2 (duplicated readability check in the sync and monitor).
- Supported product scenario / material-premise basis changes: CR-P-01 resolved. New candidates C-08 (duplication → R-2), C-09 (duplicate identity across an unreadable root) and C-10 (recovery from unreadable via full reconcile, per REQ-016) were rejected as findings.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Open (High) | Resolved | IR-002 | `definition-catalog-sync.ts` root context with `readable` / `unavailable` and per-root `enumerateUnits`; enumeration completes before any read; application-owned listing failure isolated; `catalog.markSourceUnavailable` keeps last good with a reason naming the folder. Monitor arm → `UNAVAILABLE` on an unlistable kind folder. `build-studio-server.ts` startup scan guarded. `unreadable-package-root.test.ts` (fails on IR-001, passes now), a monitor case and a journey case pass. |
| CR-002 | Open (Low) | Resolved | IR-002 | `definitionDiagnosticsStore.ts` uses `createLoadedListReloader` per subject; `definitionDiagnosticsStore.spec.ts` covers change-during-load |
| CR-003 | Open (Low) | Resolved | IR-002 | Alias removed from `projectChangeFeed.ts`; the spec asserts `nodeChangeRetryDelayMs` |

- New or remaining finding IDs: none open. Non-blocking R-2 (optional).
- Material score or classification changes: 9.0 → 9.3. Runtime Correctness 7.5 → 9.2, API/E2E Readiness 8.8 → 9.2, Cleanup 8.8 → 9.3; Shared structures 9.2 → 9.0 (R-2). Large / High unchanged.
- Recommended recipient: `/software_engineering_team/api_e2e_engineer` (primary); `/software_engineering_team/implementation_engineer` (informational)
- Remaining risks or uncertainty: remote-access auth on `/ws/definition-catalog` (QR-006); desktop SCN-012 journey; AC-008/009/010/014; unreadable-root and monitor behavior verified on macOS only (Linux probe covers rename transitions).

### CRR-003 — APE-001 failure origin: nested last-good issues have no web surface (Design Impact)

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/code-review-report.md` (§ API/E2E Failure-Origin Review (Round 3); Findings CR-004; Classification; Latest Authoritative Result)
- Review entry point and round: API/E2E Failure-Origin Review, round 3
- Review scope: `N/A` (failure-origin)
- Triggering role, report path, and finding or scenario IDs: `/software_engineering_team/api_e2e_engineer`, `api-e2e-execution-coverage-report.md` (API-REV-001); APE-001 (DESK-002 nested part), REQ-009/DSN-003, SCN-004, AC-004
- Relevant solution revision IDs: SR-005, SR-007
- Relevant architecture-review revision IDs: ARCH-REV-002
- Relevant implementation revision IDs: IR-001, IR-002
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: `Pass` (CRR-002, implementation review)
- Current authoritative result: `Fail`. Failure origin is `Design Impact`.
- What changed in the review result and why:
  - The failing case is approved behavior (REQ-009 applied to nested definitions by DSN-003) and was entered through a real desktop file write.
  - The server is correct. The web has no surface:
    - `AgentList.vue:167–169` filters out `TEAM_LOCAL` agents (pre-existing);
    - the notice drops `usingLastGood` entries;
    - Team and Org `catalogIssue` carry only root-node issues.
  - The design's only nested example assumes an Agents-page card for a team-local agent, and its file mapping gives nested issues no other surface.
  - The implementation followed the reviewed design, so the fix needs a design decision on surface and contract.
  - An earlier source-review gap is acknowledged: CRR-001/002 did not trace the nested path to a rendered surface, although it was reasonably detectable. The round-2 Runtime Correctness rationale is invalidated.
- Supported product scenario / material-premise basis changes: none. SCN-004 nested is a Supported Normal Scenario.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001…CR-003 | Resolved (CRR-002) | Resolved (unchanged) | IR-002 | API/E2E confirms unreadable-root and startup behavior (integration) and diagnostics reloads |

- New or remaining finding IDs: CR-004 (Design Impact, open). Non-blocking R-2 (optional) remains.
- Material score or classification changes: round-2 Pass superseded. Failure origin `Design Impact`. Large / High unchanged.
- Recommended recipient: `/software_engineering_team/solution_designer`
- Remaining risks or uncertainty:
  - The org-owned nested gap is established by code only; it was not executed.
  - The out-of-scope `list_available_agents` missing-member observation is passed along without attribution.
  - The test-code changes `a28465175` and `6b3a10822` wait for proportional review after a passing API/E2E run.

### CRR-004 — IR-003 / SR-008 resolves CR-004; nested-surface trace complete; Pass

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/code-review-report.md` (§ Round 4 trace; scorecard; Findings CR-004; Latest Authoritative Result)
- Review entry point and round: Implementation Review, round 4
- Review scope: `Full Re-Audit`. The shared GraphQL interface changed (`catalogIssues` replaces `catalogIssue` on Team/Org), along with catalog child ordering and the new service and catalog accessors.
- Triggering role, report path, and finding or scenario IDs: `/software_engineering_team/implementation_engineer`, `implementation-handoff.md` / `implementation-revision-record.md` IR-003 (`bd4c63796`, `214836c83`); CR-004; SR-008 / DSN-004; ARCH-REV-003 notes N-5, N-6
- Relevant solution revision IDs: SR-005, SR-007, SR-008
- Relevant architecture-review revision IDs: ARCH-REV-002, ARCH-REV-003
- Relevant implementation revision IDs: IR-001, IR-002, IR-003
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: `Fail` (CRR-003, failure-origin, Design Impact)
- Current authoritative result: `Pass`
- What changed in the review result and why:
  - Each nested kind (team-local agent; org-owned agent; org-owned Team and its local agent) is traced from the catalog unit, through the Team/Org service `listUnitIssues` / `getUnitIssues` (N-5) and the one GraphQL mapper (N-6), to the `catalogIssues` field and the owning card badge.
  - Unusable nested nodes also stay in the notice.
  - Reruns pass: server 16 files / 177 tests; typecheck clean; web 98 files / 958 tests.
  - The API/E2E durable E2E is stale after the approved contract change: it still queries Team/Org `catalogIssue`, and 3 of 8 cases fail on a schema error (reviewer run). It is carried to API/E2E as a required test update, not as a source finding.
- Supported product scenario / material-premise basis changes: none (SCN-004 nested is a Supported Normal Scenario).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-004 | Open (CRR-003, Design Impact) | Resolved | SR-008, ARCH-REV-003, IR-003 | `definition-catalog.ts` `listUnitIssues` / `getUnitIssues` (root first, path order); Team/Org services; `catalogIssues` with `toGraphqlDefinitionUnitIssues`; `AgentTeamCard` / `AgentOrgCatalogCard` badges; `definition-unit-issues.test.ts`, `DefinitionCatalogIssueCards.spec.ts`, badge spec and integration DSN-003 pass |
| CR-001…CR-003 | Resolved (CRR-002) | Resolved (unchanged) | IR-002 | Unchanged code paths |

- New or remaining finding IDs: none open. Optional R-2 remains.
- Material score or classification changes: 9.3/10, every category ≥ 9.0 (Runtime Correctness 9.2 restored; API/E2E Readiness 9.1). Large / High unchanged.
- Recommended recipient: `/software_engineering_team/api_e2e_engineer` (primary); `/software_engineering_team/implementation_engineer` (informational)
- Remaining risks or uncertainty:
  - The org-owned nested case has not been rendered live yet (API/E2E DESK-002 addition).
  - The durable E2E query needs the update described above.
  - The test-code commits `a28465175` and `6b3a10822` wait for proportional review after a passing run.

### CRR-005 — Proportional test-code review after API-REV-002 Pass

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/api-e2e-test-review-report.md` (new)
- Review entry point and round: Successful API/E2E test-code review, round 1
- Review scope: `N/A` (test review)
- Triggering role, report path, and finding or scenario IDs: `/software_engineering_team/api_e2e_engineer`, `api-e2e-execution-coverage-report.md` (API-REV-002 Pass); commits `6b3a10822`, `a28465175`, `33d290187`
- Relevant solution revision IDs: SR-005, SR-008
- Relevant architecture-review revision IDs: ARCH-REV-003
- Relevant implementation revision IDs: IR-003
- Relevant API/E2E revision IDs: API-REV-001, API-REV-002
- Relevant delivery revision IDs: N/A
- Prior authoritative result: `Pass` (CRR-004, implementation review)
- Current authoritative result: `Pass` (test-code review)
- What changed in the review result and why:
  - Three durable test paths were reviewed: the new definition-catalog live-refresh E2E (DCF-E2E-001…009), the scripted AGY fixture's read-only prompt route, and the agent-packages E2E baseline fix (Rule 9).
  - All are coherent and requirement-aligned, enter through real triggers, and are deterministic enough for their boundary.
  - The stale Team/Org `catalogIssue` query flagged in CRR-004 is fixed.
- Supported product scenario / material-premise basis changes: none

#### Prior Finding Resolution

None (no prior test-review findings). CR-004 stays resolved (CRR-004) and is now also verified live by API/E2E DESK-002 and DESK-006.

- New or remaining finding IDs: None. Optional source R-2 remains (non-blocking).
- Material score or classification changes: N/A (no scorecard for test review). Large / High unchanged.
- Recommended recipient: `/software_engineering_team/delivery_engineer`
- Remaining risks or uncertainty:
  - Rare slow folder detection under load (REQ-018 scope; QR-003 bound holds).
  - Linux evidence comes from the probe only.
  - GitHub Update was validated only against controlled HTTP.
  - Base failures `agent-team-definitions-graphql` ×5 and `agent-package-private-skills` ×2 are reported to their owners.
