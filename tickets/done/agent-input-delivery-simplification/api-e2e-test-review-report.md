# API/E2E Test Review Report

## Review Meta

- Review Round: 3. This is the v3 rewrite. Rounds 1–2 (CRR-003/004) reviewed the superseded v2 suite; their findings TR-001 and N-1 were rechecked here.
- Trigger: `/software_engineering_team/api_e2e_engineer`, API/E2E **Pass** on IR-004 (API-REV-003). Test commits `67ec5ac6ca` (baseline fix) and `34561796af` (race suite, fixture, artifacts) on `a3391c924f`.
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-006; REQ-012 / AC-012, DEC-005, SCN-014, SCN-016)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (OBS-003)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-006, SR-007)
- Design Spec Reviewed As Context: `design-spec.md` (SR-007, DS-004, V-gates)
- Supplemental Task Artifacts Reviewed As Context: `follow-ups.md`
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md` (ARCH-REV-003)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md` (IR-004)
- Original Code Review Report: `code-review-report.md` (CRR-005 Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-006`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-003)
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: Pass
- Final Validation Confidence: 95%
- Prior unresolved test-review findings rechecked:
  - TR-001: the exact-call matching is kept.
  - N-1: the precondition assertion is kept.
  - N-2: the `-32603` pins are gone, as expected. DEC-005 makes the outcome a readable refusal.
- Project testing guideline(s) applied: `TESTING.md`, rule 9 (baseline fix and diagnosed failures) and the current rule that suite descriptions live in test headers. No conflicts.
- Supported Product Scenario Basis Confirmed: `Yes`. SCN-014 is triggered for real (another root's agent marks the Task DONE with `update_task`). SCN-016 is covered by the two-server remote suite.

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/projects/teammate-delivery-task-closure-race.e2e.test.ts` | Added (v3 port of the reviewed v2 suite) | TDR-001..003: REQ-012 / AC-012, DEC-005, history continuity | A Task closure racing a teammate message append, per root, through real server boundaries | Reviewed as a diff against the reviewed v2 version `a55b727dc` |
| `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` | Updated | Supports TDR | Opt-in `AGY_FAKE_TOOL_TIMEOUT_MS` / `AGY_FAKE_TOOL_LOG`; defaults unchanged | Identical to the reviewed v2 change |
| `autobyteus-server-ts/tests/e2e/runtime/team-busy-member-mid-turn-delivery.e2e.test.ts` | Updated (baseline fix, rule 9) | Live teammate delivery mid-turn (Claude, Codex) | Reads the worker reply from `SEGMENT_CONTENT` **and** `SEGMENT_CONTENT_BATCH` items | Stale since `be00680819`; same `agent_run_id` filter as the old `ofWorker` |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | Header updated to SR-006 / DEC-005; TDR-001..003 per root |
| Assertions prove approved requirements instead of incidental details | Pass | The DEC-005 outcome is asserted on both the server side (the spy's `resolved` refusal) and the agent side (the readable MCP result). TDR-001 also asserts the kept record is shown in the root view, as DS-004 designs. The recipient never processes; TDR-002 never appends; history continuity holds through restore |
| Fixtures, setup, helpers reuse meaningful repetition | Pass | The gate moved to the one per-message `appendMessage(dir, rootRunId, message, owners)`, which is simpler than the v2 envelope scan. The history reader is adapted to the append-only JSONL logs |
| Isolation and determinism fit the boundary | Pass, with a note | Deterministic gate on the message's own content; closure observed in the Task record; N-1 precondition asserted; disposable data dir; prototypes restored. See note N-3 on sort order |
| Large files coherent and navigable | Pass | 527 lines, one surface |
| No stale/duplicated/disabled-without-reason tests | Pass | Gated like its siblings. The baseline fix updates a stale reader rather than weakening the assertion: both `WORK_DONE` and `PINEAPPLE` are still required |
| Coverage agrees with investigation and execution evidence | Pass | Ledger and report: three roots pass. On base `0216c6fb14` the suite fails (Agent: raw "cannot be cancelled" → `-32603`; Team/Org: no outcome within 300 s, then the roots can't be terminated) |
| Callers and fixtures exercise an independently established scenario | Pass | Real `update_task` DONE from another root; Task keys used as the tools require; the store gate only widens a real write window |
| Each test enters through its real trigger and actor steps | Pass | As reviewed in v2, with the v3 tool names and key-based Task addressing. The read-only `RootCommunicationEngine.deliver` spy remains for the server-side outcome and is no longer needed to see a hidden error, since the agent now sees the readable refusal directly |

### Notes (non-blocking)

- **N-3.** `savedHistory` collects every `communication_messages_*.jsonl` line that involves the root's agents, de-duplicated by `messageId` and sorted by `createdAt`, and TDR-003 compares that list for exact equality with the root-view snapshot. Two messages with the same millisecond `createdAt` would fall back to file-visit order. The suite's messages are seconds apart, so this does not affect it today. If the suite ever sends messages in quick succession, compare as sets or order by the coordinating log.
- **Diagnosed failures outside this change (from API-REV-003; owners needed):**
  - `delegated-launch-config-defaults.e2e.test.ts` (2 cases, deterministic): stale against `71d51a1608` and `52f2837ca7`.
  - `task-existing-copy-assignment` EXC-E2E-004: an intermittent reopen/release race (`a18fe714cd`) that fails before the delivery engine is reached.
  - Neither involves files in this diff. I accept the diagnosis based on the cited evidence, without independent re-verification.

## Findings

None.

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed:
  - `teammate-delivery-task-closure-race.e2e.test.ts`
  - `agy-failure-cli.mjs`
  - `team-busy-member-mid-turn-delivery.e2e.test.ts`
- Unresolved finding IDs: None
- Recommended Recipient: `/software_engineering_team/delivery_engineer`
- Notes:
  - The v2 TR-001 and N-1 fixes carried over.
  - The baseline fix is a correct, non-weakening reader update.
  - Delivery should carry the two diagnosed outside failures and the REQ-011 docs sync.
