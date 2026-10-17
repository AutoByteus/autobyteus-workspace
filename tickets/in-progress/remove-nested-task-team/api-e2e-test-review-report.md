# API/E2E Test Review Report

## Review Meta

- Review Round: 3 (delta re-review of TR-003; round 1 = CRR-003, round 2 = CRR-004)
- Trigger: `api_e2e_engineer` API-REV-003 Pass (93%): TR-003 completed in `57d388a7fd` (round 2 trigger: API-REV-002)
- Requirements Doc Reviewed As Context: `requirements-doc.md`
- Investigation Notes Reviewed As Context: `investigation-notes.md`
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-006)
- Design Spec Reviewed As Context: `design-spec.md`
- Supplemental Task Artifacts Reviewed As Context: N/A — not applicable
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md` (ARCH-REV-002)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md` (IR-002)
- Original Code Review Report: `code-review-report.md` (CRR-002 Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-005`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`, `api-e2e-test-case-ledger.md`
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-001)
- Delivery Revision Record Reviewed As Context (delivery re-entry only): N/A — not applicable
- API/E2E Result: Pass
- Final Validation Confidence: 93%
- Prior unresolved test-review findings rechecked: TR-001, TR-002, TR-003, TR-004 (see Round 2 Resolution)
- Project testing guideline(s) applied: `TESTING.md` (real triggers, test-owned data roots, baseline exceptions disclosed); no conflicts
- Supported Product Scenario Basis Confirmed: `Yes`. The scenarios are delegation forests in the Team, Agent and Org roots through Stop → reopen (REQ-001, REQ-004, AC-003), and an unreadable standalone run contained to itself (REQ-003, AC-002, DESIGN.md rule 7). The data comes from real roots driven by the scripted AGY CLI; only the truncation of one tree is synthetic, and it stands for a tree on disk that cannot be read.

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/projects/delegation-forest-restore.e2e.test.ts` | Added | AC-003 (REQ-001, REQ-004) | Delegation forest per root kind through Stop → reopen | Passes on the base too, as intended for "behaves as before" |
| `autobyteus-server-ts/tests/e2e/run-history/standalone-unreadable-tree-containment.e2e.test.ts` | Added | AC-002 (REQ-003) | Cross-run scans skip and warn; an explicit open errors; no writes; same in a new process | Negative control: fails on the base (`BASE-UC-DF.log`) |
| `autobyteus-server-ts/tests/e2e/helpers/collaboration-root-harness.ts` | Updated | shared harness | `attachRoot`, `reopenRoot` (restore mutation per kind), `stopServer`, `liveTree` exported | Reuses the existing harness; no parallel harness |
| `.../run-history/recent-run-projection-graphql.e2e.test.ts` (`149bce0be9`) | Updated (baseline fix) | existing coverage | Rebuilds readiness before queries; seeds the current team package; cursor presented to another admitted run, plus a new assertion that a member id is refused | Strengthened, not weakened |
| `.../projects/task-closure-root-visibility.e2e.test.ts` (`ac3f6267ac`) | Updated (baseline fix) | existing coverage | Waits for both Manager messages before asserting ≥ 2 | Race fix; assertion unchanged |
| `.../projects/ad-hoc-task-delegation.e2e.test.ts` (`623d34eabc`) | Updated (baseline fix) | existing coverage | Ignores the writer's transient `*.tmp` files like `*.lock` | Exact record list still asserted |
| `autobyteus-web/tests/e2e/agent-org-task-team-disclosure-probe.mjs` (`3f54e8eaae`) | Updated (baseline fix) | existing coverage | Row selector includes delegated rows in their stop-button wrapper; definitions feed routed | Matches the SR-007 DOM; same routing as `4ec3dd9eb3` |
| `.../agent-team-runs/hierarchical-team-run-config-graphql.e2e.test.ts` (`e6ba249a96`) | Updated (baseline fix) | existing coverage | Seeds a flat team; keeps persist / snake_case projection / restart / restore / runtime validation; a member carrying `members` now fails | See TR-003 (stale hierarchy naming) |
| `TESTING.md` (`45291d105f`) | Updated (guideline note) | test guidance | "Known intermittent e2e" for `task-copy-idle-lifetime` | Claims checked: the 3 s `--help` probe is in `antigravity-cli-capability.ts:5,96`; the 58,954 ms result and the "not available on antigravity_cli" error are in the R7b logs. Its line "reported to … owners" is made true by FU-1 below |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Fail | DF and UC are clear. The flat rewrite keeps hierarchy naming for a shape that no longer exists (TR-003) |
| Assertions prove approved requirements instead of incidental implementation details | Pass | DF: agent-only members in every team record; the same forest edges before and after reopen; the deepest leaf reached by run id from the restored coordinator; the mounted team unchanged. UC: other runs' file changes, member projection, Token Meter and open all work; the warning names the bad run and only it; the bad run's open and member query error; collaboration-file hashes unchanged |
| Fixtures, setup, helpers, and data builders reuse meaningful repetition | Pass | Both suites build on `collaboration-root-harness.ts`; `reopenRoot` mirrors `terminate` |
| Test isolation and determinism are appropriate for the exercised boundary | Fail | The harness runs from a disposable HOME and data dir. Waits are condition-based (`until`), and the scan order relied on in UC is sorted in source (`standalone-root-location-service.ts:107,118`). However, UC-2 runs the built `dist/app.js` but does not state the build prerequisite (TR-001). DF: reviewer reran it 6/6 green; see TR-004 for the one undisclosed failure |
| Large files remain coherent and navigable | Pass | 149 and 158 lines, one behaviour each |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests remain | Fail | Harness `let app` and `let url` are never reassigned (TR-002); hierarchy names remain (TR-003) |
| Added, updated, and removed coverage agrees with the coverage investigation and execution evidence | Fail | Totals check out: final scripted e2e 27/29 with the two failures explained, web 4382, HTRC 7/7, TCRV 3/3 ×3, recent-run 9/9, ad-hoc 3/3. However, `DF-run1.log` (DF-3 failed) is not mentioned in the ledger (TR-004) |
| Test callers and fixtures exercise an independently established supported scenario | Pass | AC-002/AC-003 from the approved requirements |
| Each test enters through its scenario's real trigger | Pass | Real Studio HTTP/WS/GraphQL, scoped MCP tools and restore mutations; UC-2 uses a real new server process. The only synthetic step is truncating one tree (the bad data under test) |

## Findings

| Finding ID | Test Path / Scenario | Evidence | Required Action | Classification / Owner |
| --- | --- | --- | --- | --- |
| TR-001 | `standalone-unreadable-tree-containment.e2e.test.ts` UC-2 | Line 137 spawns `dist/app.js`. The header's Run line does not say to build first, so a stale `dist` silently tests other code: a base build fails UC-2, and an older branch build can pass or fail regardless of the change. The sibling tests on `dist/app.js` state it (`removed-remote-provider-saved-selection-graphql.e2e.test.ts:16`: "Prerequisites: `pnpm -C autobyteus-server-ts build` for the current worktree") | Add the same Prerequisites line to the header | Local Fix / `api_e2e_engineer` |
| TR-002 | `collaboration-root-harness.ts` | The diff changes `const app` and `const url` to `let`, but neither is reassigned: `stopServer` only closes `app`. That is dead mutability in this change | Restore `const` | Local Fix / `api_e2e_engineer` |
| TR-003 | `hierarchical-team-run-config-graphql.e2e.test.ts` (`e6ba249a96`) | The rewrite renames the `describe` to "TeamRun configuration…" but keeps the retired nested shape's names: the file name, `seedHierarchy`, `CreateHierarchicalTeamRun`, `HierarchicalTeamRunResume`, `TerminateHierarchicalTeamRun`, `RestoreHierarchicalTeamRun`, the `hierarchical-team-run-*` targets, the "hierarchy fixture" descriptions (lines 54/55/77), and `researchConfiguration` for what is now just the lead's settings. After this ticket a reader takes "hierarchical team run" to mean a supported shape | Rename to the flat meaning: e.g. `team-run-config-graphql.e2e.test.ts`, `seedTeam`, `*TeamRun*` operation names, neutral fixture text, `leadConfiguration` directly. Update the ledger/report path references | Local Fix / `api_e2e_engineer` |
| TR-004 | `api-e2e-test-case-ledger.md` DF-1..3 | `evidence/api-e2e/DF-run1.log` (10:59, the current code: `attachRoot` line 210, `stopReopenAndReach` line 111) shows DF-3 failing. The cause is "Timed out waiting for agent-org stream ready" after `restoreAgentOrgRun`, followed by cleanup "Agent organization run not found". The ledger and report cite only `DF-run2.log` and the base run. Reviewer reran DF 6 times in a clean env: 6/6 × 3/3 pass (`/tmp/crr003/DF-1..6.log`, not retained), so this is not reproduced and is likely load. It is still a failed run of a new test, and it must be disclosed | Record DF-run1 in the ledger with its error, the circumstances (concurrent load, if so) and the reruns; if it recurs, treat it as an Org restore finding rather than load | Local Fix / `api_e2e_engineer` |

## Follow-ups

| Follow-up ID | What is wrong, where | Evidence | Why it is outside this ticket | Suggested Task description |
| --- | --- | --- | --- | --- |
| FU-1 | `tests/e2e/projects/task-copy-idle-lifetime.e2e.test.ts` is intermittent under load: a stop over 15 s; a shutdown at 58,954 ms against the 59,000 ms lower bound (measured from the test's own observation); a delegation refused because the AGY `--help` probe (3 s, `antigravity-cli-capability.ts:5,96`) times out → "model … is not available on antigravity_cli" | `evidence/api-e2e/R7-scripted-e2e-final.log`, `R7b-task-copy-idle-lifetime-{base-1,branch-1,branch-2}.log`; identical on the base `db00ba16a9`; now documented in TESTING.md (`45291d105f`) | Not touched by this ticket; fails the same way on the base | Make the idle-lifetime e2e deterministic: time from the server's step-exit event, not the test's observation; widen or derive the stop deadline. Decide whether AGY model discovery should tolerate a slow `--help` (retry, or keep the last known models) instead of reporting the model unavailable. Overlaps `project_task_7e13a4af` (idle-lifetime determinism); extend that Task with the discovery cause. Remove the TESTING.md note when it is fixed |
| FU-2 | `autobyteus-web/tests/e2e/team-reload-member-freshness-probe.mjs` E-005: after a failed required Agent read, the live definitions change feed (`f7fcf9055a`) reloads the Team list, so `GetAgentTeamDefinitions` appears; the probe asserts an exact request sequence that predates the feed | `evidence/api-e2e/probes/`, `probes-base/team-reload-member-freshness/`; identical on the base | Not touched by this ticket; it is a request-policy decision for the feed's owner | Decide whether the feed's Team-list reload after a failed required Agent read is intended. If so, update the probe's expected sequence; if not, suppress the reload |

- Sent to: `/project_task_manager` (CRR-003 follow-up message). Recorded by extending existing Tasks: FU-1 → `project_task_7e13a4af-67bb-409b-a2ec-9fc594ff816b`; FU-2 → part 4 of `project_task_a1dfb6dc-0bc2-4e16-a6e7-4c288d9d4887` (web probes). Both TODO.

## Round 2 Resolution (CRR-004)

| Finding ID | Prior Status | Current Status | Verification Evidence |
| --- | --- | --- | --- |
| TR-001 | Local Fix | Resolved | The UC header line 16 now reads "Prerequisites: `pnpm -C autobyteus-server-ts build` for the current worktree (UC-2 starts dist/app.js)". `dist` (11:45) post-dates the last `src` commit (`cbecdc076d`, 10:54) |
| TR-002 | Local Fix | Resolved | The harness diff no longer touches the `app`/`url` declarations (`const` restored) |
| TR-003 | Local Fix | Still open | `2e70401f18` renames the file to `team-run-config-graphql.e2e.test.ts` (history kept as a rename), `seedTeam`, the operations, the targets, the fixture text and the identifiers. The ledger and report references are updated. But a case-insensitive search still finds two of the retired names, both error codes: line 98 `HIERARCHY_E2E_AUTOBYTEUS_MODEL_MISSING` and line 300 `HIERARCHICAL_TEAM_RUN_CREATE_FAILED`. These are what a failing run prints. The handoff's "no 'hierarch' remains" holds only for a case-sensitive search |
| TR-004 | Local Fix | Resolved | Ledger DF row and report now disclose DF-run1. The explanation, that the earlier harness never called the restore mutation, is consistent with the log. The Team and Agent roots restore on their next message, so DF-1 and DF-2 passed in run1 with the same number of agent starts as in run2 (6 and 7). The Org root's stream needs the restore first: DF-3 shows 4 agent starts in run1 (the forest only, nothing after Stop) against 6 in run2, and cleanup found no Org run. Reruns on the final harness: reviewer 6/6, API/E2E 3/3 ×3, plus `CRR003-fixes-run.log` (12/12: config 7, DF 3, UC 2) |

## Round 3 Resolution (CRR-005)

| Finding ID | Prior Status | Current Status | Verification Evidence |
| --- | --- | --- | --- |
| TR-003 | Local Fix (open) | Resolved | `57d388a7fd` changes only the two codes, to `TEAM_RUN_CONFIG_E2E_AUTOBYTEUS_MODEL_MISSING` and `TEAM_RUN_CREATE_FAILED`. `grep -nic "hierarch\|research"` on the file returns 0, and no `src` or `tests` file refers to the old codes. `CRR004-team-run-config.log`: 7/7 |

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed:
  - added: `delegation-forest-restore.e2e.test.ts`, `standalone-unreadable-tree-containment.e2e.test.ts`;
  - updated: `collaboration-root-harness.ts`;
  - baseline-fix commits: `149bce0be9`, `ac3f6267ac`, `623d34eabc`, `3f54e8eaae`, `e6ba249a96` → `2e70401f18` → `57d388a7fd`;
  - TESTING.md note: `45291d105f`.
- Unresolved finding IDs: None
- Recommended Recipient: `delivery_engineer`
- Notes:
  - The two new e2e files and the harness update are still uncommitted, and delivery commits them. Do not stage `autobyteus-web/test-results/` (generated probe output) or the untracked package `dist/` directories.
  - Follow-ups FU-1 and FU-2 are recorded in existing Tasks (`project_task_7e13a4af…`, `project_task_a1dfb6dc…`). The TESTING.md "Known intermittent e2e" note stays until FU-1 is fixed.
