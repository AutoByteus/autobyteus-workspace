# API/E2E Test Review Report — work-journal

## Review Meta

- Review Round: 2 (CRR-005). Trigger: api_e2e_engineer "round 2 (API-REV-002, after CRR-004): Pass, 93.5%", tested at f0ff3a8671; docs and evidence in 6a4209ea75.
  - **No durable test changed in round 2.** `git diff f0ff3a8671 6a4209ea75 --stat -- autobyteus-server-ts autobyteus-web` is empty; 6a4209ea75 holds only reports and evidence.
  - The tests that arrived with the merge b0c81c8f20 (Codex turn-rejection tests) come from origin/personal and other tickets. They are not API/E2E changes of this ticket.
  - Round-2 delta result: `Not Applicable`. The round-1 review of the 5 durable files stands as is.
  - The Codex rerun (API-03c on f0ff3a8671, after the merged Codex backend changes) keeps NB-T1's claim exact: 5 run_bash calls give 5 Command entries (a failed `sed -i`, then a python retry), and out.txt == beta. Evidence: evidence/API-03-live-round2/codex/summary.json and API-03c-codex-round2.log (`1 passed | 3 skipped`).
- Review Round (original): 1
- Trigger: api_e2e_engineer "API/E2E validation passed (API-REV-001, 93.5%) … proportional test-code review"
- Requirements Doc Reviewed As Context: requirements-doc.md (SR-014)
- Investigation Notes Reviewed As Context: investigation-notes.md (as needed)
- Solution Revision Record Reviewed As Context: solution-revision-record.md
- Design Spec Reviewed As Context: design-spec.md (DS-001 to DS-005, escalation trigger 1)
- Supplemental Task Artifacts Reviewed As Context: work-journal-contract.md; work-journal-builtin-tools.json (fixture copy used by the live test)
- Architecture Review Revision Record Reviewed As Context: architecture-review-revision-record.md (P1 native ordering)
- Implementation Revision Record Reviewed As Context: implementation-revision-record.md (IR-001, IR-002)
- Original Code Review Report: code-review-report.md (CRR-002 Pass)
- Code Review Revision Record: code-review-revision-record.md
- Current Code Review Revision ID: CRR-003
- Coverage Investigation: api-e2e-coverage-investigation.md
- Execution Coverage Report: api-e2e-execution-coverage-report.md
- API/E2E Revision Record Reviewed As Context: api-e2e-revision-record.md (API-REV-001)
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: Pass
- Final Validation Confidence: 93.5% (as reported by API/E2E)
- Prior unresolved test-review findings rechecked: None (first test review)
- Project testing guideline(s) applied: repository `TESTING.md` (per the coverage investigation): test-owned data roots, real HOME only for signed-in CLIs, gated live runs. No conflicts.
- Supported Product Scenario Basis Confirmed: `Yes`
- Reviewed commit: b105dc9b1b. Product code is unchanged since 8f5bb563b1 (`git diff 8f5bb563b1 b105dc9b1b --stat -- autobyteus-server-ts` shows only the 5 test files).

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| autobyteus-server-ts/tests/e2e/runtime/work-journal-live-runtimes.e2e.test.ts | Added | SCN-W1, REQ-W1/W4/W6/W7, AC-W1/W4/W5/W6; design escalation trigger 1 (P1) | The same task on each live runtime through the real server; AutoByteus native ordering; Claude `/compact` write-once | Gated per runtime; Grok removed by user decision (429 on the free account) |
| autobyteus-server-ts/tests/e2e/runtime/work-journal-restore-transport.e2e.test.ts | Added | SCN-W5, SCN-W6, REQ-W5/W6, D5, AC-W4/W5 | Rotation, a write-once closed file, an older run without `work_journal/` rebuilt at the first turn end after restore | Scripted AGY CLI; no credits |
| autobyteus-server-ts/tests/e2e/runtime/work-journal-skill-improvement.e2e.test.ts | Added | BEH-W5, AC-W8, BEH-W4 (first need) | Skill Improvement renders the journal, lists it in the trigger, and the improver reads it | Gated (DeepSeek / LM Studio) |
| autobyteus-server-ts/tests/e2e/app-data-migrations/remove-work-trace-exports-startup.e2e.test.ts | Added | BEH-W6, DS-005, DEC-W10 | Built `dist/app.js` startup on synthesized released shapes; decoy, symlink, byte-identical rest, idempotent second start | Needs a current build |
| autobyteus-server-ts/tests/e2e/app-data-migrations/append-only-message-logs-startup.e2e.test.ts | Updated | REQ-W9 (no regression of another migration's test) | The faithful-root setup no longer assumes its migration is registered last; it checks the order own-run → conversion and clears the records of migrations newer than the simulated install | A stale assumption fixed (made false by `20261019_remove_work_trace_exports`) |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | One file per surface; header comments cite REQ/SCN/AC, gates and the run command; case names state the outcome |
| Assertions prove approved requirements instead of incidental details | Pass | AC-W6 (open file includes the turn), AC-W4 (each link resolves to a raw record id), AC-W5 (closed file byte-identical with the same mtime; regenerated after restore byte-identical), D5 (no machinery lines, no links to compaction ids), P1 (raw record count at TURN_COMPLETED equals the final count), AC-W8 (trigger wording, paths, no "work trace", improver reads a listed path), BEH-W6 (removal, keeps, idempotence). The live check of "one entry per call" is `>=` (see NB-T1). |
| Fixtures, setup, helpers and data builders reuse meaningful repetition | Pass (note) | Existing helpers are reused (Studio server, WebSocket send, secret vault). `findRunMemoryDir`/`graphql`/`until` are repeated across the three runtime files (see NB-T2); acceptable for E2E files of one surface each |
| Isolation and determinism appropriate for the boundary | Pass | Temp data roots per suite, removed in `afterAll`/`afterEach`; private HOME/DB for the built-startup test; bounded waits with diagnostics; the send helper stops at a runtime ERROR; live non-determinism is limited to model behavior, and `out.txt == beta` checks the work was really done |
| Large files coherent and navigable | Pass | 177–288 lines each, each one surface |
| No stale, duplicated, disabled-without-reason or compatibility-only tests | Pass | Gates are documented with their reason (credits, CLI login, build); AOML-1's stale "registered last" assertion is removed rather than kept |
| Coverage agrees with the coverage investigation and execution evidence | Pass | Execution report rows map to these files; evidence API-03/05/06/07 present; I checked the "exactly one entry per call" claim against the 7 saved live summaries (all EXACT; see NB-T1) |
| Test callers and fixtures exercise an independently established scenario | Pass | Each scenario is established upstream (SCN-W1/W5/W6, BEH-W5/W6, P1) |
| Each test enters through the real trigger and follows real steps, with no setup real use does not produce | Pass | Real GraphQL/WebSocket/startup entry. Deleting `work_journal/` reproduces the real state of a run recorded before the feature (raw traces, no journal; SCN-W6, BEH-W4), after waiting for the turn-end update to write its manifest. Migration data is synthesized in the released shapes, not copied from user data |

## Findings

None.

Non-blocking notes (no action required for delivery):

- **NB-T1:** work-journal-live-runtimes.e2e.test.ts:201-204 says "Every tool call has exactly one journal entry", but asserts `toolEntries.length >= callIds.size`, which would not catch a duplicated entry.
  - The claim is true for every run executed: I checked the 7 saved `summary.json` files under evidence/API-03-live*/. Call entries (excluding `Tool result`) equal tool calls in each.
  - The pairing and accounting invariants are also proven deterministically by the unit tests (IMP-02).
  - A later touch could assert `toolEntries.filter((l) => !l.startsWith("Tool result")).length === calls.length`. No live re-run is needed for this ticket.
- **NB-T2:** the three runtime E2E files repeat `findRunMemoryDir`, `graphql` and `until`. A shared helper under tests/e2e/helpers would be fine, but it is optional.

## Follow-ups

| Follow-up ID | What is wrong, where | Evidence | Why it is outside this ticket | Suggested Task description |
| --- | --- | --- | --- | --- |
| FU-T1 | AE-006 (gemini pricing) failed in the shared server E2E suite DB: "table token_usage_run_records does not exist" | api-e2e report; API-02-rerun-failures.log (passes alone 5/5) | src/token-usage is untouched by this ticket; this is suite-order or shared-DB isolation | Investigate why AE-006 sees a DB without token_usage_run_records when run in the full server E2E suite, and make its setup independent |
| FU-T2 | `tests/architecture/application-framework-boundaries.test.ts:3000` fails at the base (carried from CRR-001) | implementation-handoff.md | Pre-existing at the base | Owner decides whether agent-memory-explorer-service.ts belongs in the pinned list |

- Sent to: `No Task manager found — kept in this report`

## Latest Authoritative Result

- Result: `Pass` (cumulative). Round 2 (CRR-005, API-REV-002): `Not Applicable`, because no durable test changed; the round-1 Pass (CRR-003) stands.
- Changed durable test paths reviewed: the 5 files above (round 1); none in round 2
- Unresolved finding IDs: None
- Recommended Recipient: `delivery_engineer`
- Notes:
  - Residual items carried for delivery: live Grok not covered (user decision); N2 on slower hardware not measured; full ~2 h suite not re-run after the AOML-1 fix (AOML-1 passes alone).
  - Evidence copies keep exact journal bytes, so `git diff --check` flags indented blank lines inside them. This is expected; the files are evidence, not source.
  - Ticket `probes/` is still untracked; committing it is the Solution Designer's decision.
