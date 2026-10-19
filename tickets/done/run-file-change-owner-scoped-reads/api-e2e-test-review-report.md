# API/E2E Test Review Report — run-file-change-owner-scoped-reads

## Review Meta

- Review Round: `2`
- Trigger: the TR-001 fix and API/E2E round 2 (API-REV-002, Pass) from `/software_engineering_team/api_e2e_engineer`
  - Round 2 delta: commit `ae178ebe39` (the probe only; `git show --stat ae178ebe39`)
  - Round 1 scope: `git diff 581fecdf8e 2486c8b7c4`
  - Evidence: commit `2e5fbdb80f`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-003)
- Investigation Notes Reviewed As Context: not reopened, since the durable test scope did not need it
- Solution Revision Record Reviewed As Context: not reopened (SR-003 unchanged)
- Design Spec Reviewed As Context: `design-spec.md` (SR-003)
- Supplemental Task Artifacts Reviewed As Context: none
- Architecture Review Revision Record Reviewed As Context: not reopened (ARCH-REV-002 unchanged)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md` (IR-001; product code unchanged at `03f2d4da05`)
- Original Code Review Report: `code-review-report.md` (CRR-001, Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-003`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-001, API-REV-002)
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: Pass (API-REV-002)
- Final Validation Confidence: 95.4%
- Prior unresolved test-review findings rechecked: TR-001, now resolved (see Findings)
- Project testing guideline(s) applied: root `TESTING.md`, as recorded in the coverage investigation. Conflicts or discrepancies: none with this skill.
- Supported Product Scenario Basis Confirmed: `Yes` (SCN-001..SCN-006)

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/projects/owner-scoped-member-file-changes.e2e.test.ts` | Added | SCN-002, SCN-003, SCN-006; AC-002..AC-005, AC-007..AC-009, AC-011 | Team and org member owner reads over real HTTP/GraphQL on real Team and Org runs, running then stopped | It waits for each running member's stored record before the first live read. That avoids FU-C (a pre-existing race outside this ticket, explained in the header), and the owner-read assertions stay full strength |
| `autobyteus-server-ts/tests/e2e/projects/agent-run-collaboration-member-file-changes.e2e.test.ts` | Updated | SCN-001, SCN-004, SCN-006; AC-001, AC-006, AC-007, AC-009 | Hub copy list (existing) plus content over the hub route; the run-id route narrowed; a deleted file | `expectCopyContent` is shared by the running and stopped cases |
| `autobyteus-server-ts/tests/e2e/run-history/standalone-unreadable-tree-containment.e2e.test.ts` | Updated | AC-013 (preserved containment, R-003) | The moved trigger (a team-member context-file read) must itself emit the skip warning naming the bad run | The per-read warning window (`scanWarnings`) proves the trigger and not some other read of the check. Mutation check API-03c is recorded |
| `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` | Updated | AC-003, AC-005, AC-008 (pending file) | `WRITE_FILE_HOLD:<path>`: an active `write_file` step that holds the turn | Scoped to messages without `CALL_TOOL:`; the fixture unit test was rerun (API-09) |
| `autobyteus-web/tests/e2e/owner-scoped-file-reads-probe.mjs` and the `test:e2e:owner-scoped-file-reads` script | Added | SCN-001..SCN-005; AC-001..AC-006, AC-010, AC-012 | Probe-owned real stack: seed through public APIs; server timings; desktop and mobile Artifacts journeys | See TR-001 |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | One server suite per family (Team, Org) with a shared `expectOwnerReads`. Probe cases B-001..B-007 and T-API are named by journey and AC |
| Assertions prove approved requirements instead of incidental implementation details | Pass | Assertions check exact bytes, content type and `no-store`; 409, 404 "not available", 404 "not found" and 400 bodies; `[]` from run-id reads; wrong-owner errors; and in the probe, that only owner routes are requested and the viewer shows the file's own text |
| Fixtures, setup, helpers, and data builders reuse meaningful repetition | Pass | `content`, `served`, `expectOwnerReads`, `delegatesWriter`, `recordedOnDisk`; the probe reuses `openArtifact` and `expectOnlyOwnerRequests` |
| Test isolation and determinism are appropriate for the exercised boundary | Pass | The server E2E files are isolated (disposable `HOME`, harness-owned data root) and deterministic after the FU-C wait (10/10, API-04b). The probe owns its stack and cleans up, and since round 2 each journey fails on browser errors (TR-001 resolved) |
| Large files remain coherent and navigable rather than mixing unrelated scenarios | Pass | The 633-line probe covers one journey family (owner-scoped file reads) with sections for stack, seed, timing and journeys, and a header that documents its modes |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests remain | Pass | The old "same list as the run-id query" assertions now expect `[]`; nothing is disabled |
| Added, updated, and removed coverage agrees with the coverage investigation and execution evidence | Pass | Cases API-02b, API-03b, API-04, API-05 and API-06 match the files and logs |
| Test callers and fixtures exercise an independently established supported scenario rather than proving one by themselves | Pass | Every case maps to SCN-001..SCN-006. `WRITE_FILE_HOLD` stands in for a runtime that is mid-write, the state AC-008 names |
| Each test enters through its scenario's real trigger and follows the real actor's or event's steps, without a setup real use does not produce | Pass | Roots, delegation and files are made through public APIs and the scripted runtime. The journeys go sidebar or mobile picker → Artifacts → click. File texts are rewritten, and B-005's file is moved aside, in the probe-owned workspace only; editing or deleting a workspace file is a normal user action. The stored-record wait is a documented workaround for FU-C, not a new product state |

## Findings

No open findings. TR-001 was raised in round 1 and is resolved in round 2.

**TR-001 resolution (round 2, `ae178ebe39`)**
- How it works now: `withBrowserErrorCheck` wraps every journey. It fails the journey on any `pageerror` or console error raised during it. The only allowed lines are Chrome's `404 (Not Found)` resource lines whose URL contains `/file-change-content`. They are allowed only in B-005 (`allowContent404: true`), and the journey fails if there are more of them than 404 content responses.
- Warm-up: errors before the journeys are recorded (`warmUpBrowserErrors`) but not asserted, because a cold Nuxt start reloads pages (TESTING.md).
- Rerun evidence: `API-05-06-{small,large}-seed-check-r2/evidence.json` were run at `ae178ebe39` and every case passes. B-005 has 2 allowed lines against 2 content 404s; every other journey has 0 browser errors; `warmUpBrowserErrors` is empty.
- Mutation check: `API-05c-browser-error-mutation-check.out.txt` shows the check bites. B-004 fails on an injected page exception, and B-005 fails on an injected console error next to its two allowed 404s.

Round 1 record, kept for history:

| Finding ID | Test Path / Scenario | Evidence | Required Action | Classification / Owner |
| --- | --- | --- | --- | --- |
| TR-001 (resolved) | `autobyteus-web/tests/e2e/owner-scoped-file-reads-probe.mjs`, journeys B-001..B-007 | The probe collects `pageerror` and console errors into `errors` (lines 433–434, 515–516) and saves them as `evidence.browserErrors` (line 408), but nothing asserts on them. A journey that raised a page exception or an unexpected console error would still pass. TESTING.md "Browser probes" says: "Probes fail on browser errors." Other probes in the folder assert it, for example `delegated-copies-large-hub-probe.mjs:800` and `agent-org-task-team-disclosure-probe.mjs:416`. In this run the recorded errors were only B-005's expected 404 resource lines (3 on the large seed, 2 on the small; the execution report checked this by hand), so the API-REV-001 result stands. The gap is in what the probe catches from now on | Make each journey fail on browser errors. Capture errors per case, and allow only the `404 (Not Found)` resource lines that B-005 expects for its deleted file. For example, allow them only inside B-005, no more of them than its `/file-change-content` 404 responses; any `pageerror` or other console error fails the case. Then rerun the probe as the rerun-by-impact plan requires and update the evidence and the execution report | `Local Fix` / `api_e2e_engineer` |

## Follow-ups

| Follow-up ID | What is wrong, where | Evidence | Why it is outside this ticket | Suggested Task description |
| --- | --- | --- | --- | --- |
| — | None new. FU-C (`RunFileChangeService.load` live-cache race) was already sent to `/project_task_manager` by API/E2E and is Task autobyteus-180 | API-08, API-04b | — | — |

- Sent to: `None` (no new follow-ups from this review)

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed (round 1 scope; round 2 changed only the probe):
  - `autobyteus-server-ts/tests/e2e/projects/owner-scoped-member-file-changes.e2e.test.ts`
  - `autobyteus-server-ts/tests/e2e/projects/agent-run-collaboration-member-file-changes.e2e.test.ts`
  - `autobyteus-server-ts/tests/e2e/run-history/standalone-unreadable-tree-containment.e2e.test.ts`
  - `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs`
  - `autobyteus-web/tests/e2e/owner-scoped-file-reads-probe.mjs`
  - `autobyteus-web/package.json` (script)
- Unresolved finding IDs: none
- Recommended Recipient: `/software_engineering_team/delivery_engineer`
- Notes:
  - TR-001 is resolved and every durable test change passes review.
  - Product code is unchanged since the CRR-001 source review (`03f2d4da05`).
  - After this review, at the user's request, the reviewer merged the latest `origin/personal` into the ticket branch as merge commit `34487d8878`.
    - The merge was clean, and it touches none of the ticket's code areas. The only file both sides changed was `autobyteus-web/package.json`, where origin bumped the version.
    - Server typecheck passes on the merge, and the one overlapping web spec (`runProjectionConversation.spec.ts`) passes, 14/14.
    - Delivery applies its own rerun-by-impact to the integrated state.
