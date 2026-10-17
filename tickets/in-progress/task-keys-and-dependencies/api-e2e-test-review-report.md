# API/E2E Test Review Report — task-keys-and-dependencies

## Review Meta

- Review Round: `1`
- Trigger: API/E2E pass (API-REV-001, round 1) from `/software_engineering_team/api_e2e_engineer`, 2026-10-17
- Requirements Doc Reviewed As Context: `…/requirements-doc.md` (SR-003)
- Investigation Notes Reviewed As Context: not reread (no test change depends on them)
- Solution Revision Record Reviewed As Context: not reread (SR-001–SR-003 unchanged since CRR-002)
- Design Spec Reviewed As Context: `…/design-spec.md` (REC-005 refusal order, D-URL, DEC-011–013)
- Supplemental Task Artifacts Reviewed As Context: `ui-ux-spec.md` (picker keyboard, copy, tree summary)
- Architecture Review Revision Record Reviewed As Context: not reread (unchanged)
- Implementation Revision Record Reviewed As Context: IR-003 (unchanged since CRR-002)
- Original Code Review Report: `…/code-review-report.md` (CRR-002 Pass)
- Code Review Revision Record: `…/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-003`
- Coverage Investigation: `…/api-e2e-coverage-investigation.md`
- Execution Coverage Report: `…/api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `…/api-e2e-revision-record.md` (API-REV-001)
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: `Pass`
- Final Validation Confidence: 95.6% (every category ≥ 93%)
- Prior unresolved test-review findings rechecked: none (first test review)
- Project testing guideline(s) applied: root `TESTING.md` (as recorded in the coverage investigation). No conflicts or discrepancies.
- Supported Product Scenario Basis Confirmed: `Yes` (SCN-001–SCN-013, MP-003)

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
- Changed durable test paths reviewed: the 7 files above
- Unresolved finding IDs: none
- Recommended Recipient: `/software_engineering_team/delivery_engineer`
- Notes: OBS-001–004 are non-blocking observations in the execution report. OBS-001 (initial active option can be a greyed loop option) matches the approved prototype and is pinned by PT-E2E-017.
