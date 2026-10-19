# API/E2E Test Review Report

## Review Meta

- Review Round: 5 (delta re-review of TR-005/TR-006, CRR-009; merged-state round 4 = CRR-008; rounds 1..3 = CRR-003..005)
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
- Current Code Review Revision ID: `CRR-009`
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

## Round 4 — Merged-State Test Review (CRR-008, API-REV-004)

- **Trigger:** `api_e2e_engineer` API-REV-004 Pass (90%) on the DR-001 merge (HEAD `270047a5d4` plus test and docs commits).
- **Changed durable test scope:**

| Durable Test Path | Change | Notes |
| --- | --- | --- |
| `autobyteus-web/tests/e2e/team-status-live-probe.mjs` (uncommitted) | Updated: TS-005..007 (`nestedTaskTeamJourney`); `countRequests` records the operation name | Real backend and scripted AGY. Each dot is checked against the agent rows shown under it, collapsed, expanded and live; no Team dot on agent rows; no overlap; gray after stop; placement recorded. See TR-005 |
| `autobyteus-web/tests/e2e/agent-org-task-team-disclosure-probe.mjs` (`99445daefc`) | Baseline fix | The label check now matches the Team status words (upstream REQ-007). The shape is still exact (name, status word, starter, address, run id). Not weakened |
| `autobyteus-web/tests/e2e/fixtures/team-activity-presentation.page.vue` (`b34470dd10`) | Baseline fix | Running runs are built with `buildTestTeamContext`, so `AgentTeamContext.view` exists (the cause of the Nuxt 500). A proper fix; see TR-006 for a leftover |
| `TESTING.md` (`dbf6b0a118`, `7b02d49bae`) | Guideline, at the user's request | "Rerun by impact" with a ledger of validated cases. Consistent with the rest of TESTING.md; no finding |

- **Evidence the reviewer checked:**
  - `round2/head.txt` is `270047a5d4`.
  - Suites: unit 5745; integration 393 pass plus the 2 known content-cadence failures; web 4446; contracts and guards exit 0.
  - Scripted e2e: 27/29. DCM-008 fails on `spawnSync ps ETIMEDOUT` (`M6-scripted-e2e.log:3787`), from `agy-background-process-groups.ts:10,59` (`PS_TIMEOUT_MS = 2_000`). The AGY runtime is not touched by this ticket.
  - Probes, final runs: team-status-live `final-` and `nested-3` pass (TS-001..007). team-activity-presentation passes on run `-4`; Org disclosure on run `-2`; task-closure-tree on run `-143905`. Run `-2` was a harness refusal of an existing `--output-dir`, not a test result.
- **Supported product scenario:** confirmed. A task Team's member delegates a task Team in Agent, Team and Org runs (the delegation forest of AC-003), with universal Team status from the merged upstream.

### Round 4 Findings

| Finding ID | Test Path / Scenario | Evidence | Required Action | Classification / Owner |
| --- | --- | --- | --- | --- |
| TR-005 | `team-status-live` TS-005..007; ledger row TS-005..007; FU-4 | The first version of these cases asserted upstream REQ-002, "the outer Team counts the inner one". It failed in all three roots with "Timed out: inner Team hidden" (`round2/probes/team-status-live/evidence.json`). The cases were then rewritten to "each dot = the agent rows shown under it", with placement recorded. Run `nested-2` also failed TS-006 with "tree rows overlap", because the row selector matched the `/manager` row's own avatar; the outermost-match filter fixed it. The ledger presents TS-005..007 as "3/3 pass, twice" and FU-4 as an open question, but does not say the REQ-002 assertion was run and failed, or that the current cases no longer test "agents its members delegated". The rewrite is acceptable while FU-4 is open, because the cases assert only what holds under either reading, but the history must be disclosed | Record in the ledger and FU-4: the original REQ-002 assertion, its failure and evidence, and why the case was rewritten. State that TS-005..007 do not cover REQ-002's "agents its members delegated" until FU-4 is decided, and that the probe must assert it if the owner chooses that reading. Record the `nested-2` TS-006 overlap as a probe selector defect, now fixed | Local Fix / `api_e2e_engineer` |
| TR-006 | `fixtures/team-activity-presentation.page.vue` (touched in `b34470dd10`) | The fixture's `subscribed` ref (line 69) is toggled by "Vary unrelated facts" (line 242) and shown in `independent-facts`, but nothing reads it any more. `AgentTeamContext` has had no `isSubscribed` since `57ab99fcc4`, and after `b34470dd10` the fixture no longer passes it at all. The probe never asserts it. So the "unrelated fact" varies nothing (Core Principle 7: dead code in a touched file) | Remove `subscribed` from the ref, the toggle and the facts line | Local Fix / `api_e2e_engineer` |

### Round 4 Follow-ups

| Follow-up ID | What | Evidence | Why outside | Suggested Task |
| --- | --- | --- | --- | --- |
| FU-3 | `listAgyBackgroundProcessGroups` runs `ps -A` synchronously with a 2 s timeout. Under load, `ps` succeeds but takes longer than 2 s, so `stopExact` refuses with `AGY_EXACT_STOP_FAILED` (ownership "unconfirmed") a stop whose child and groups were already inactive | `round2/M6-scripted-e2e.log:3784-3800` (DCM-008); `agy-background-process-groups.ts:10,59`; `agy-stream-process.ts` | AGY runtime, not touched by this ticket | Give the process-table read a load-tolerant timeout or retry. Don't refuse an exact stop when the child and groups are already known to be inactive |
| FU-1 (new symptom) | task-copy-idle-lifetime: the Team root's GraphQL "fetch failed" to its in-process server; undici's cause is not printed | `round2/M6-scripted-e2e.log` | Existing Task `project_task_7e13a4af` | Log the fetch cause on failure and add it to the Task |
| FU-4 | A task Team delegated by a member of a task Team is shown beside the outer Team, not under it, in Agent, Team and Org runs. The outer Team's dot therefore does not count those agents, which upstream `delegated-team-aggregate-status` REQ-002 ("agents its members delegated") asked for; the recorded clarification ("anything shown under the Team row") is met. The placement predates this ticket (DJ-1 on the branch and on the base) | `round2/probes/team-status-live/evidence.json` (REQ-002 assertion failed in all three roots); `team-status-live-nested-3` | A requirement decision on a delivered ticket; this ticket did not change placement | The owner of delegated-team-aggregate-status decides: show the inner Team under its delegating Team (and count it), or amend REQ-002 to "shown under". Then update TS-005..007 to assert the decision |

- Sent to: `/project_task_manager` (CRR-008 follow-up message). Recorded: FU-3 → `project_task_7eac44bd-1929-4068-ba78-cc5219632703`; FU-4 → `project_task_8a0d1dc8-a471-4a7a-9d06-b5e166551dd9` (a product decision for the user); FU-1 symptom added to `project_task_7e13a4af-67bb-409b-a2ec-9fc594ff816b`. All TODO.

## Round 5 Resolution (CRR-009, API-REV-005)

| Finding ID | Prior Status | Current Status | Verification Evidence |
| --- | --- | --- | --- |
| TR-005 | Local Fix | Resolved | The ledger's TS-005..007 row and the coverage report's FU-4 now record: (1) the original REQ-002 assertion and its three failures, with evidence; (2) the rewrite while FU-4 is open; (3) the `nested-2` TS-006 selector defect and its fix; (4) "Not covered: … must assert again if FU-4 chooses that reading". Evidence paths are listed per run |
| TR-006 | Local Fix | Resolved | `00d6782303` removes the `subscribed` ref, its toggle and its facts-line entry, and the stale "subscription" wording in the SR006-BR-002 title and comment (3+/5−). `grep subscri` finds nothing in the fixture or the probe. `crr008-team-activity-presentation/evidence.json`: Pass, SR006-BR-001..004 all Pass, no failures, teardown clean |

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed:
  - rounds 1..3, as before;
  - round 4: `team-status-live-probe.mjs` (uncommitted), `99445daefc`, `b34470dd10`, TESTING.md `dbf6b0a118` and `7b02d49bae`;
  - round 5: `00d6782303`.
- Unresolved finding IDs: None
- Recommended Recipient: `delivery_engineer`
- Notes:
  - `team-status-live-probe.mjs` (TS-005..007) and the ticket artifacts are uncommitted. Do not stage `autobyteus-web/test-results/` or the untracked package `dist/` folders.
  - The desktop check of the merged Team status (upstream AC-011) is deferred, with the user's agreement, to the user's check at delivery.
  - Docs-sync inputs: three stale sub-Team lines (`code-review-report.md`, Round 3).
  - Follow-ups are tracked:
    - FU-1 → `project_task_7e13a4af…`
    - FU-2 → `project_task_a1dfb6dc…`
    - FU-3 → `project_task_7eac44bd…`
    - FU-4 → `project_task_8a0d1dc8…`, a product decision for the user
