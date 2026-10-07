# API/E2E Test Review Report — Project workspace paths

## Review Meta

- Date: 2026-10-07. Test-review round **1**; cumulative code-review revision **CRR-002**.
- Trigger: `/api_e2e_engineer`, **API-REV-001 Pass**, successful durable test-code changes. This is **proportional test-code review**, not source re-audit or failure-origin review.
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-workspace-path`; branch `codex/project-workspace-path`; clean on entry at `a0daf2def`.
- Reviewed delta: `ed8897135..27088e87c` (six test files + TESTING.md); `a0daf2def` records API evidence/report only. No production source, historical fixtures or removed files in this delta.
- Requirements context: `requirements-doc.md`, **SR-002/AP-001**, REQ/AC-001–006 and SCN-001–004; investigation: `investigation-notes.md`; solution history: `solution-revision-record.md`; design: `design-spec.md`, **SR-003**. Complete upstream chain remains in this ticket; no intent change.
- Supplemental Product/behavior package: **N/A — not applicable**.
- Architecture history: `architecture-review-revision-record.md`, **ARCH-REV-001**; implementation history: `implementation-revision-record.md`, **IR-001**.
- Original source-review authority: `code-review-report.md`, **CRR-001 Pass**, unchanged by this result. Cumulative history: `code-review-revision-record.md`.
- Coverage context: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-case-ledger.md`, `api-e2e-revision-record.md` (**API-REV-001**). Delivery revision: **N/A**.
- API/E2E result: **Pass**. Final confidence **95.00%**, attributed to API owner; post-repository 91.43%, broader validation Required/completed. No confidence rescoring here.
- Prior unresolved test-review findings: **None — first test review**.
- Classification preserved: **task_size Medium; architectural_risk High**; reviewed route.
- Project guideline: worktree `TESTING.md` (Projects mutation/browser/feed/startup guidance, isolation, current-build and evidence/cleanup rules), root/server/web AGENTS.md. No guideline conflict. Old real-workspace-ID prose noted by CRR-001 is corrected in this delta; retained commands still apply.
- Supported Product Scenario Basis Confirmed: **Yes**.

Paths below are worktree-relative; evidence/report paths without package prefixes are relative to this ticket.

## Changed Durable Test Scope

| Durable test path | Change | Related scenario / requirement | Coherent responsibility / review evidence |
| --- | --- | --- | --- |
| autobyteus-server-ts/tests/e2e/projects/project-task-boundaries.e2e.test.ts | Updated | SCN-001/002/004; AC-001/002/003/006; preserved Task/auth contracts | Actual native and scoped-MCP parsing/ack/selection; HTTP persistence, malformed/old-key rejection and canonical duplicate atomicity. E-006 directly saves a missing unregistered path and compares exact disk/ack rows; existing preservation/auth cases retained. |
| autobyteus-server-ts/tests/e2e/projects/project-mutation-node-locality.e2e.test.ts | Updated | SCN-001/003/004; AC-002/004/006 | Two built private nodes: equal absolute strings accepted as local references, node B remains UNREGISTERED, foreign Project patch denied, registry bytes and both-node restart continuity checked. Does not claim physical remote filesystem access. |
| autobyteus-server-ts/tests/e2e/projects/projects-graphql.e2e.test.ts | Updated | SCN-001–004; AC-002–006 | Real schema/resolver/service/store: direct and aggregate path commands, exact view/disk keys, whole-patch snapshots, order/omission/clear, invalid schema fields, ordinary-save reduction and retained Tasks. Global registration remains separate. |
| autobyteus-server-ts/tests/e2e/projects/projects-startup-migration.e2e.test.ts | Updated | SCN-003; AC-004; MP-001 upgrade/restart contract | Existing actual Studio/Standalone startup suites keep historical fixtures and conversion output. Added per-folder superset startup/read-no-write/restart/ordinary-save checks; private HOME. In Standalone variant the standalone launch proves no rewrite/health; subsequent read/save is explicitly exercised through Studio. |
| autobyteus-server-ts/tests/e2e/projects/project-change-feed.e2e.test.ts | Updated | SCN-001/002/003; AC-002/005; existing feed contract | Real strict WS feed: tool-authored missing root matches GraphQL/disk; disconnected client snapshots then receives direct path edit/unlink; no replay and existing Task/root/auth checks preserved. |
| autobyteus-web/tests/e2e/projects-feature-probe.mjs | Updated | SCN-002/003/004; AC-002/003/005/006 | Actual editor/picker/manual draft, path targeting/encoded query/focus, exact persisted keys, no registry/mkdir, unavailable edit/unlink/reload. Fresh error responses and exactly one injected 503 prevent stale-alert false positives. Owned HOME/process/port cleanup strengthened. |

- No durable test file changed: **No**; Not Applicable does not apply.
- No durable files removed. Removed old-ID/time/registration-required assertions are replaced by approved path behavior, not simply disabled.
- TESTING.md is an associated instruction update, not a seventh test file.
- Logs/screenshots/JSON receipts are evidence, not production code or additional durable tests.

## Supported Scenario / Trigger Confirmation

- **SCN-001/002:** user asks a selected agent to create or patch a known Project. Native preparation and selected scoped-MCP → shared tool contract → ProjectService → store/ack are the exercised production boundary. Scripted session acquisition is disclosed; no autonomous-model claim.
- **SCN-003:** user opens a saved Project after update/unregistration and edits/unlinks its reference. Faithful historical superset fixtures represent approved existing data; query/read/startup leaves bytes intact, ordinary Save reduces only that Project's links. These are preservation fixtures, not a new arbitrary-corruption policy.
- **SCN-004:** user types a folder path or chooses the registered picker root. Browser actions traverse the actual editor/request/backend; independent disk and registry assertions prove outcomes rather than screenshots alone.
- **MP-001 / feed contract:** existing startup/retry and disconnected-client resynchronization are established contracts. Normal process restart and socket close/reconnect trigger those paths. No new recovery machinery is required; **MP-002 remains rejected/not reachable** and no ordinary-save-while-gated scenario is manufactured.
- Invalid input and injected transport rejection reproduce approved validation/preserved client failure handling. The injected 503 proves client handling only, not an actual backend-outage cause. Stored assignment/history sentinels prove non-interference, not live delegation or history replay.

## Proportional Test-Code Checks

| Check | Result | Evidence / notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | E-006/E-008, PATH-001, startup variants and PT-E2E-003/004 identify their changed path contract. Existing related cases stay grouped by boundary. |
| Assertions prove approved requirements, not incidental details | Pass | Exact saved keys and no-write bytes are explicit ACs; canonical aliases reject entire patches; registry/folder state checked independently; router path/focus and reload prove usable UI identity. |
| Fixtures/setup/helpers reuse meaningful repetition | Pass | Existing gql/projectCall/error/snapshot/registration helpers retained; private-node fixture reused; browser savedLinks/workspaceRow helpers centralize new selectors and disk checks. |
| Isolation/determinism appropriate to boundary | Pass | Private data/HOME/SQLite, free ports, built-source prerequisites; real readiness/response waits; scoped cleanup. Browser rejection awaits each fresh response and counts the injected 503. Existing teardown and new port rebind receipts match logs. |
| Large files remain coherent/navigable | Pass | Each file owns one transport or Project journey group; named cases and helpers remain navigable. No source-size thresholds or forced splitting applied. |
| No stale/duplicated/disabled-without-reason/compatibility-only tests | Pass | Changed association calls use paths; remaining old keys are explicit rejection/historical fixtures or unchanged global registration. Broader live-Claude skip is intentional, disclosed and unclaimed, not newly disabling path coverage. |
| Coverage changes agree with investigation/execution evidence | Pass | Six changed paths match report and commit; all seven test/doc SHA256 values match build/source receipt; focused/broad totals match logs, final browser-2 matches strengthened assertions. Overlapping runs not added together. |
| Tests reproduce independently established scenarios | Pass | SCN-001–004, REQ/AC-001–006 and MP-001 establish authority, not the tests themselves. No scope or compatibility promise added. |
| Real trigger and actor/event steps exercised | Pass | Browser drives real controls; native/MCP/GraphQL enter supported boundary; restart uses actual built entrypoints; feed closes/reconnects sockets. Historical setup establishes saved-state preconditions; mutations/readers then run normally. |

## Evidence Reconciliation / Review Method

Static review of all six diffs, relevant setup/helpers/teardown and fresh browser assertions, plus ledger/reports and raw result summaries. Verified current file SHA256 against `api-e2e-evidence/api-001/build-and-source-receipt.json`; every listed test/doc hash matches. `git diff --check ed8897135 HEAD -- TESTING.md autobyteus-server-ts autobyteus-web` passes. No production/historical-fixture delta found.

API-owned logs corroborate 240 owner tests/17 files; HTTP 8, GraphQL 10, nodes 1, startup 5, feed 7; broader Project suite 41 pass/1 gated skip across 8 files; web 119/15. Both browser receipts contain 16 Pass cases, no page errors and successful cleanup. Final browser-2 PT-E2E-004 records WORKSPACE_PATH_INVALID, WORKSPACE_ALREADY_LINKED and exactly one 503; PT-E2E-003 includes special-character path/exact disk rows; PT-E2E-010 confirms backend restart. Counts overlap and are not combined into a total.

**No test rerun required:** changed assertions are judgeable from source and successful evidence. No source/test edits, builds, processes or browser sessions created by this review. No source scorecard or implementation-source size audit repeated.

## Findings

**None.** No actionable test-code correctness, organization, isolation or evidence defect found. No failure classification or upstream intent/design change.

## Latest Authoritative Result

- **Pass — CRR-002**, proportional successful API/E2E test-code review, six updated durable test paths reviewed.
- Unresolved findings: **None**. Failure classification: **N/A**. Medium/High retained.
- Original **CRR-001 source Pass remains authoritative and unchanged**; this separate report does not reopen or replace it.
- Recommended next recipient: configured delivery Pass recipient, expected `/delivery_engineer`; receipt below records actual route.
- Delivery retains normal integration/docs/user-verification/finalization gates. API confidence 95.00% is attributed, not a full-product acceptance.
- Limits retained: no production frontend bundle, packaged/full-product desktop/released-app upgrade, cross-OS/physical remote nodes/customer dataset, live model/optional voice, comprehensive accessibility or explicit user verification. Normal prebuild/build required before built-process reruns because owned SDK outputs were cleaned. No merge/push/release authorized by this review.

### Routing Record

Report and CRR-002 persisted before route lookup. `get_handoff_rules` selected the successful post-API/E2E durable test-code review → `/delivery_engineer` rule on 2026-10-07. Only this most-specific outcome applies. Dispatch pending; no duplicate source/API assignment or additional recipient.
