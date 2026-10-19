# API/E2E Test Review Report — task-keys-and-dependencies

## Review Meta

- Review Round: `2` (round 1: CRR-003, API-REV-001)
- Trigger: API/E2E revalidation pass of the integrated state (API-REV-002, round 2) from `/software_engineering_team/api_e2e_engineer`, HEAD `c95e0138e8`, 2026-10-17
- Requirements Doc Reviewed As Context: `…/requirements-doc.md` (SR-003)
- Investigation Notes Reviewed As Context: not reread (no test change depends on them)
- Solution Revision Record Reviewed As Context: not reread (SR-001–SR-003 unchanged since CRR-002)
- Design Spec Reviewed As Context: `…/design-spec.md` (REC-005 refusal order, D-URL, DEC-011–013)
- Supplemental Task Artifacts Reviewed As Context: `ui-ux-spec.md` (picker keyboard, copy, tree summary)
- Architecture Review Revision Record Reviewed As Context: not reread (unchanged)
- Implementation Revision Record Reviewed As Context: IR-004 (integration and baseline test fixes; source delta reviewed in CRR-004)
- Original Code Review Report: `…/code-review-report.md` (CRR-004 Pass)
- Code Review Revision Record: `…/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-005`
- Coverage Investigation: `…/api-e2e-coverage-investigation.md`
- Execution Coverage Report: `…/api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `…/api-e2e-revision-record.md` (API-REV-002)
- Delivery Revision Record Reviewed As Context: `…/delivery-revision-record.md` (DR-001)
- API/E2E Result: `Pass`
- Final Validation Confidence: 95.6% (every category ≥ 93%)
- Prior unresolved test-review findings rechecked: none (CRR-003 had no findings)
- Project testing guideline(s) applied: root `TESTING.md` (as recorded in the coverage investigation). No conflicts or discrepancies.
- Supported Product Scenario Basis Confirmed: `Yes` (SCN-001–SCN-013, MP-003)

## Round 2 Scope (API-REV-002)

API/E2E wrote no durable test in round 2; the round-1 tests (TKD-API-001, TKD-AGY-001, PT-E2E-017 and the updated cases) are unchanged since CRR-003. This round reviews the durable test changes that came with IR-004, as rerun by API/E2E.

| Durable Test Path | Change | Related Scenario / Requirement | Review |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/app-data-migrations/team-run-v1-production-upgrade.e2e.test.ts` (`fa49138794`) | Updated | Operational upgrade ledger contract; this ticket's `20261017_project_task_keys_v1` adds a row | Pass. The `+4` hardcode becomes "new ledger rows equal the migrations this startup ran", from the server's migration statuses, so a missing or extra row still fails, and the four Team migrations are still asserted by name. In a normal run it is not reached, because 3/4 cases fail earlier in `assertConvertedPackage` for a cause outside this ticket (`20260901_agent_org_flat_team_families_v1` writes an AgentOrg tree; owner: that migration). API/E2E proved the check executes and passes (12 new rows, including this ticket's) with a temporary, reverted edit |
| `autobyteus-server-ts/tests/architecture/application-framework-boundaries.test.ts` (`9eeb58fb9d`) | Updated | Base contract: flat Teams (remove-nested-task-team) | Pass. Replaces an assertion on a removed runtime message with the type that now carries the rule; not related to this ticket's behavior |
| `autobyteus-web/tests/e2e/projects-feature-probe.mjs` (`361eea070d`) | Updated | PT-E2E-005/006 Task form presentation at two viewports | Pass. A condition wait for the shell's real layout state after `setViewportSize`, not a fixed sleep; the overflow and text assertions are unchanged. PT-E2E-001..017 pass at HEAD |

Round-2 checks: intent clear (commit messages and inline comments state the cause); assertions not weakened; deterministic waits; real triggers unchanged; no stale or disabled tests added. Rule-9 items FU-API-004 (PMU-021 file-explorer socket error on `page.reload()`) and FU-API-005 (task-copy-idle-lifetime timing) have recorded causes outside this ticket and are not test-code findings here.

## Round 1 Record (CRR-003, unchanged)

## Changed Durable Test Scope

This review covers only the API/E2E stage's changes. The implementation stage's test changes were reviewed in CRR-001/CRR-002. `evidence/scripts/`, logs and screenshots are evidence, not durable test code.

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/projects/project-task-boundaries.e2e.test.ts` (TKD-API-001) | Added | SCN-011/012; AC-010, 020, 022, 024, 025, 027; REQ-007 (CR-001) | Agent tool boundary for keys and `depends_on`: MCP equals native, rejected writes leave files byte-identical, no number spent, retired prefix | One coherent tool-boundary case |
| `autobyteus-server-ts/tests/e2e/projects/task-existing-copy-assignment.e2e.test.ts` (TKD-AGY-001) | Added | SCN-011; AC-019, 022, 023, 027; DEC-012/013; MP-003 | Real Agent root, scripted runtime: `delegate_task` by key (any case) and long ID in both modes; blocked Tasks delegated; "a deleted Task"; key in the assignment message; Temp-task rules | Fits this file's existing-copy subject |
| `autobyteus-server-ts/tests/e2e/projects/ad-hoc-task-delegation.e2e.test.ts` | Updated | REQ-018/019 | `update_task` by long ID returns the key, and the long ID is absent from the result | The old assertion expected the long ID |
| `autobyteus-server-ts/tests/e2e/projects/collaboration-prompt-wording.e2e.test.ts` (M-34/35/36/38) | Updated | REC-005 (Task resolved before copy checks) | Wrong-run-ID refusal texts now use a real open Task, so the Task check passes and the copy refusal is reached | The texts themselves are unchanged |
| `autobyteus-web/tests/e2e/projects-feature-probe.mjs` (PT-E2E-017; PT-E2E-006/007/009) | Added / Updated | SCN-005/007/008/010/013; AC-011–015, 017, 018, 026 | Browser journey on the real board, Task page and editor; earlier cases follow the key URL and map tool-returned keys to stored IDs | PT-E2E-017 is long but sectioned and navigable |
| `autobyteus-web/tests/e2e/project-manager-ux-probe.mjs` (PMU-015) | Updated | REQ-022 | The tab's "Open in Projects" href is the key URL | — |
| `autobyteus-web/tests/e2e/project-manager-ux-task-locator-cases.mjs` (PMU-020/021/024/025) | Updated | REQ-012, AC-016 | Tree summary leads with the key; tooltip / name include it (en and zh-CN); a Temp task has no key | Summary text is compared without the key prefix, and the key is asserted separately |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | Case IDs name their ACs; inline comments mark each AC section |
| Assertions prove approved requirements instead of incidental implementation details | Pass | Exact results and refusal texts (REQ-018), stored `dependsOnTaskIds`, file snapshots for "nothing written", absence of `project_task_` in Task-ID fields, href / pathname for key URLs, `projectTasks(` request count for live updates. Updated assertions follow the approved behavior and were not weakened (the ad-hoc case adds a negative check) |
| Fixtures, setup, helpers, and data builders reuse meaningful repetition | Pass | `toolError`, `stored`, `idOf`, `k()`, `storedIdOf`, `summaryLabel`, `keyOf` helpers. The one inline repeat of the key-stripping logic sits inside a page `evaluateAll`, where the Node-side helper cannot be used |
| Test isolation and determinism are appropriate for the exercised boundary | Pass | Fresh Projects per case; condition waits (`waitFor` / `until`). One fixed `sleep(1800)` is used to assert the 1.5 s "Copied" timeout, which is appropriate |
| Large files remain coherent and navigable rather than mixing unrelated scenarios | Pass | New cases sit in the files whose subject they extend |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests remain | Pass | Outdated long-ID / `task_x` expectations were replaced, not kept beside new ones; the only skip is the existing `liveClaude` gate |
| Added, updated, and removed coverage agrees with the coverage investigation and execution evidence | Pass | Matches the execution report's AC proof table and the gated rerun log |
| Test callers and fixtures exercise an independently established supported scenario rather than proving one by themselves | Pass | Each case maps to an approved SCN / AC. Deleting a Task while its copy works is MP-003 (reachable) |
| Each test enters through its scenario's real trigger and follows the real actor's or event's steps, without a setup real use does not produce | Pass | Agents act through the real tools (MCP and native, scripted Manager via a real root); user edits go through the UI; another client's edit goes through GraphQL. In PT-E2E-017, statuses and the first dependencies are set through the real agent tool writer, as agents do |

## Findings

None.

## Follow-ups

| Follow-up ID | What is wrong, where | Evidence | Why it is outside this ticket | Suggested Task description |
| --- | --- | --- | --- | --- |
| — | None new from this review | — | — | — |

- Sent to: `None`. FU-API-001–003 are recorded by API/E2E in its report.

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed: round 2, the three IR-004 baseline-fixed files above; round 1, the 7 files in the round-1 record (unchanged)
- Unresolved finding IDs: none
- Recommended Recipient: `/software_engineering_team/delivery_engineer`
- Notes: API-REV-002 Pass at the integrated HEAD `c95e0138e8` (95.6%). The team-run-v1 3/4 and the two intermittent items are recorded with causes outside this ticket (FU-API-004/005; the flat-team-families migration owner).
