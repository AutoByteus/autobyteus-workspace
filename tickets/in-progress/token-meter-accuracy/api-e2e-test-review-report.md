# API/E2E Test Review Report — token-meter-accuracy

## Round 2 (CRR-009, latest authoritative)

- Trigger: `/software_engineering_team/api_e2e_engineer`, API/E2E **Pass**.
  - API-REV-002 failed on F-API-002-01. IR-005 and IR-006 followed, and API-REV-003 (round 3) passed at 94%.
  - Validated build: `3c1d99922` (code `c0f1b9a80`). Artifacts commit: `21974ba2a`.
- Implementation context: CRR-008 Pass (IR-006). Classification preserved: Large / High.
- Testing guideline: `TESTING.md`. Discrepancy for delivery docs sync: on HEAD, TESTING.md lists none of these live gates:
  - `RUN_NATIVE_COMPACTION_METER_E2E` (new);
  - `RUN_RUNTIME_TOKEN_USAGE_E2E`;
  - the `RUN_CODEX_E2E` Codex compaction suite.
- Supported product scenario basis confirmed: `Yes`. AC-011 (native compaction keeps the reading and counts the summary call) and the event order D-13 relies on.

### Changed Durable Test Scope (since API-REV-001)

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/autobyteus-compaction-token-reading-live.e2e.test.ts` | Added (`88f03cb27`; opt-in, `RUN_NATIVE_COMPACTION_METER_E2E=1`) | AC-011, D-12; D-13 event order | Real native compaction through the Studio server on a real model. It covers: the summary call counted with its tokens, the reading kept, the summary-call save before `completed`, the next call smaller, and the persisted summary equal to the live stream | Uses the shared `NativeRuntimeLiveHarness`. Settings it changes are restored in `afterAll`. The run command uses `env -i`, so only the chosen key reaches the test-owned vault. LM Studio alternative needs no credentials |
| `autobyteus-server-ts/tests/e2e/runtime/token-usage-runtime-graphql.e2e.test.ts` | Updated (`be39baf40`) | Statistics GraphQL in the live runtime suite | Determinism fix: the statistics window now opens before `createAgentRun`, because `usageStatisticsInPeriod` selects by run creation time | A one-line move with a precise rationale (1 of 3 Codex runs fell outside the old window) |

Durable test changes from IR-003 to IR-006 (`token-usage-compaction-ingestion.test.ts`, the web store, panel and handler specs) were reviewed with the implementation source in CRR-004, CRR-005, CRR-007 and CRR-008.

### Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | One case with a descriptive name; the header states the gate, cost and setup |
| Assertions prove approved requirements instead of incidental implementation details | Pass | AC-011 facts: call +1, totals + the summary tokens, reading and window unchanged, the next reading smaller. The order assertion (summary-call save before `completed`) is still essential under SR-014: the summary call reports a model call, so if it arrived after `completed` it would clear the note |
| Fixtures, setup, helpers, and data builders reuse meaningful repetition | Pass | Shared native live harness; small local frame helpers |
| Test isolation and determinism are appropriate for the exercised boundary | Pass | Owned settings are restored; the temp HOME is cleaned; a bounded turn loop (at most 3 short turns) reaches compaction; the trigger is derived from the observed prompt. `be39baf40` removes a real ordering flake |
| Large files remain coherent and navigable | Pass | 131 lines; one surface |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests remain | Pass with note | The assertions are current. The header bullet and two comments still describe the superseded round-4 rule ("a newer revision clears the note"; "changes the revision the note records"). Since SR-014, only the run's next live model call clears the note. See the note below |
| Added, updated, and removed coverage agrees with the coverage investigation and execution evidence | Pass | LIVE-006 log; DESK-004/005 desktop evidence matches |
| Test callers and fixtures exercise an independently established supported scenario | Pass | A native run that compacts on the agent's own model (upstream REQ-007; AC-011) |
| Each test enters through its scenario's real trigger and follows the real actor's steps | Pass | Real Studio server, public GraphQL and agent WebSocket, a real model. Compaction is triggered by real settings and real turns; there is no synthetic state |

### Findings

None actionable.

Non-blocking note: in `autobyteus-compaction-token-reading-live.e2e.test.ts`, update the header bullet ("… the agent's next call (a newer revision) clears the note") and the comments before the `between` and `next` assertions to the SR-014 rule: "the agent's next live model call clears the note". The assertions themselves can stay. This is a wording-only fix and can be made during delivery or in the follow-up ticket.

### Observation forwarded (pre-existing, outside this change)

API/E2E found that the standalone roll-up call count does not refresh live while a delegated copy makes calls. It updates only at the host's next save.

- I confirmed this is pre-existing: before this ticket the refetch watched the host's exact call count, which a child's calls also never change.
- D-9 only re-keyed it to the host revision.
- This is a separate ticket candidate, not a regression.

### Latest Authoritative Result (round 2)

- Result: `Pass`
- Changed durable test paths reviewed: the 2 paths above.
- Unresolved finding IDs: None.
- Recommended Recipient: `/software_engineering_team/delivery_engineer`

## Round 1 (CRR-003)

## Review Meta

- Review Round: 1
- Trigger: `/software_engineering_team/api_e2e_engineer` API/E2E Pass (API-REV-001). Branch `codex/token-meter-accuracy`, HEAD `2acf9b394`; test commits `f78921e5f..2acf9b394`.
- Requirements Doc Reviewed As Context: `requirements-doc.md` (Approved)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (incl. AF-16)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-001–SR-006)
- Design Spec Reviewed As Context: `design-spec.md` (SR-005)
- Supplemental Task Artifacts Reviewed As Context: `probes/` (P2/P3 fixtures reused through `tests/fixtures/claude-sdk-usage/claude-sdk-probe-frames.ts`)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md` (ARCH-REV-003)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md` (IR-001, IR-002)
- Original Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/code-review-report.md` (CRR-002 Pass)
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-003`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-001)
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: `Pass`
- Final Validation Confidence: 95%
- Prior unresolved test-review findings rechecked: None (first test review)
- Project testing guideline(s) applied: `TESTING.md` at the repository root. There is no closer `TESTING*.md`.
  - No conflict with this skill.
  - Discrepancy, already recorded by API/E2E for delivery docs sync: TESTING.md does not list the `RUN_RUNTIME_TOKEN_USAGE_E2E` gate or the new Codex compaction suite.
- Supported Product Scenario Basis Confirmed: `Yes`. The coverage maps to SCN-001–SCN-004, AC-001 to AC-006, AC-008, DEC-005 (a) and the CR-F-001 upgrade scenario SCN-CR-01.

All changes since `f78921e5f` are test-only. `git diff --name-only f78921e5f..2acf9b394`, excluding `tickets/`, lists only `autobyteus-server-ts/tests/**`.

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `tests/e2e/token-usage/claude-sdk-selected-model-graphql.e2e.test.ts` | Updated (rewritten) | AC-001, AC-003, AC-004, AC-008, AC-002, DEC-005, DEC-002 b | Claude probe frames → real `ClaudeCallUsageTracker` → accumulator → SQL → GraphQL | Obsolete main-loop split, turn-sum reading and read-time derivation assertions were removed with their removed behavior. P2 and P3 cases use the shared probe fixture. The migration case applies the release's own SQL `UPDATE` |
| `tests/e2e/token-usage/token-usage-ledger-provider-semantics.e2e.test.ts` | Updated | DEC-005 (a) / CR-F-001; REQ-009 | Ledger consolidation → GraphQL provider semantics | Adds a ledger-era Claude row (402.5 % reading) → null readings with exact totals; also asserts a non-Claude reading is kept |
| `tests/e2e/token-usage/astra-fable-…`, `gpt56-…`, `token-usage-ledger-graphql…`, `token-usage-unit-prices-graphql…` | Updated | D-4 contract | Direct model-call payload fixtures | Each gains one line, `reports_model_call: true`. The direct payloads are model calls |
| `tests/e2e/token-usage/token-usage-analytics-graphql.e2e.test.ts` | Updated (baseline fix, Rule 9) | Analytics isolation | Global range aggregates | Cleanup deletes the whole facet table. This is safe because `vitest.config.ts` sets `fileParallelism: false` |
| `tests/helpers/org-migration-continuation-fixtures.ts` | Updated (baseline fix) | Existing Org continuation | Current `beginPreparation` factory contract | Restore-only behavior is preserved |
| `tests/e2e/helpers/claude-live-agent-harness.ts` | Updated (baseline fix) | Live Claude harness | Current session-manager contract | `deactivateForRun` and the `ownSession` callback are added |
| `tests/e2e/runtime/token-usage-runtime-graphql.e2e.test.ts` | Updated (opt-in live) | AC-001, AC-003, D-10, REQ-006 | Real runtimes through the Studio server (HTTP GraphQL plus agent WebSocket) | Runs through the real server instead of a hand-built websocket; adds a Claude multi-call case (live order, call count, latest reading, totals = calls + remainder) |
| `tests/e2e/runtime/claude-agent-compaction-rotation.e2e.test.ts` | Updated (opt-in live) | AC-004, SCN-003, REQ-009 | Real Claude auto-compaction | Per-turn calls and results; summariser remainder; Σ observations = SDK cumulative `modelUsage` |
| `tests/e2e/runtime/codex-compaction-token-reading.e2e.test.ts` | Added (opt-in live, `RUN_CODEX_E2E=1`) | AC-006, REQ-006, D-9 | Real Codex compaction through the Studio server | Checks the reading-only save: no call, no tokens, revision + 1, and the persisted summary matches the live stream. Uses a temporary `CODEX_HOME` with a symlinked `auth.json`, the same pattern as the documented Grok suite |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | Names state behavior and cite the AC or decision, e.g. "carries the P3 compaction summariser in the remainder, never as a call…" and "stores each post-compaction reading as a reading-only update…" |
| Assertions prove approved requirements instead of incidental implementation details | Pass | Assertions cover call counts, the latest reading versus the turn sum, totals equal to `modelUsage` or calls + remainder, a revision advance with an unchanged count, and null DEC-005 readings with exact totals. One Claude live assertion (reading = call prompt) encodes ASM-001 from P4; this is acceptable as a contract probe in an opt-in live suite |
| Fixtures, setup, helpers, and data builders reuse meaningful repetition | Pass | Shared probe fixture (`callFrames`, `resultFrame`); `startStudioE2eRuntimeServer`; `sendE2eSendMessageCommand`; local `summaryOf`, `callObservations` and `resultObservation` builders |
| Test isolation and determinism are appropriate for the exercised boundary | Pass | The deterministic suites use unique run IDs and probe-frame fixtures with a monotonic clock. Live suites are gated and use temporary data and home directories. The global facet wipe is safe under serial file execution. Non-blocking: the Codex live suite does not delete its run record (see notes) |
| Large files remain coherent and navigable rather than mixing unrelated scenarios | Pass | `token-usage-runtime-graphql` (one surface: real runtime token usage) and `claude-sdk-selected-model-graphql` (one pipeline) stay coherent |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests remain | Pass | Removed assertions match removed behavior (commit `0a5290aa8`). Ledger cleanup moved to `tokenUsageRunRecord`. Skips are gated with stated run commands |
| Added, updated, and removed coverage agrees with the coverage investigation and execution evidence | Pass | Matches LIVE-001–005, DESK-003 and the reported gates (E2E 41 pass / 28 gated-skip; mutation check on live-sum subtraction) |
| Test callers and fixtures exercise an independently established supported scenario rather than proving one by themselves | Pass | Every case maps to an approved scenario or decision; fixtures come from captured probe frames (P2, P3) |
| Each test enters through its scenario's real trigger and follows the real actor's or event's steps, without a setup real use does not produce | Pass | Live suites drive real runtimes through the Studio server's public GraphQL and WebSocket. Deterministic suites enter below the CLI through the production tracker, accumulator and GraphQL. The migration case runs the release's own SQL statement, and the ledger case runs the real registered consolidation. DESK-003 covers a real installed-profile upgrade |

## Findings

None actionable.

Non-blocking notes:

- `codex-compaction-token-reading.e2e.test.ts` leaves its run record and facets in the shared test database. Other suites delete their records by `runId`. This is opt-in and harmless with unique IDs and the analytics suite's global wipe. Optionally add `tokenUsageRunRecord.deleteMany({ where: { runId } })` in its `finally`.
- `claude-agent-compaction-rotation.e2e.test.ts` asserts the reading drop only `if (before > 0)`. The summariser-remainder and Σ = `modelUsage` assertions carry the requirement, so this is acceptable.

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed: the 12 paths listed above, all under `autobyteus-server-ts/tests/`.
- Unresolved finding IDs: None
- Recommended Recipient: `/software_engineering_team/delivery_engineer`
- Notes:
  - Classification preserved: Large / High.
  - For delivery:
    - Docs sync: TESTING.md should list `RUN_RUNTIME_TOKEN_USAGE_E2E` and the Codex compaction suite.
    - Integration: SR-006 / AF-16 conflicts with `origin/personal` in `agy-stream-event-converter.ts` and `token_usage.md`.
    - AC-010 is user verification.
  - API/E2E reported these observations for other owners (base drift, not caused by this change):
    - `team-run-v1-production-upgrade` and `codex-interrupted-compaction` E2E are stale.
    - Catalog gaps.
    - Duplicate user-message rendering.
