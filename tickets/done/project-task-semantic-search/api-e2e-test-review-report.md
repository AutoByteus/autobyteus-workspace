# API/E2E Test Review Report

## Review Meta

- Review Round: 2
- Trigger: API/E2E pass, API-REV-003 (round 3, on the latest-base merge `600d079b9c`), from `/software_engineering_team/api_e2e_engineer`. Round 1 of this review followed API-REV-002
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-007)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (as indexed; not reread for this bounded review)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-007)
- Design Spec Reviewed As Context: `design-spec.md` (SR-007)
- Supplemental Task Artifacts Reviewed As Context: none needed
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md` (ARCH-REV-003)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md` (IR-003, IR-004)
- Original Code Review Report: `code-review-report.md` (CRR-006, Pass: merge resolutions)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-007` (round 1: `CRR-005`)
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-001…API-REV-003)
- Delivery Revision Record Reviewed As Context: `delivery-revision-record.md` (DR-001; the merge was a delivery Local Fix)
- API/E2E Result: `Pass` (API-REV-003); validated merge `600d079b9c`; reports and evidence `82c5b2cd13`. Round 1: API-REV-002 on `9f0df7eab3`
- Final Validation Confidence: 95% (every category ≥ 95%)
- Prior unresolved test-review findings rechecked: none open (round 1 had no findings)
- Project testing guideline applied: the worktree `TESTING.md`, as the coverage investigation records. Rules applied: E2E runs in a clean environment; never the user's app or data (`~/.autobyteus`). No conflicts or discrepancies.
- Supported Product Scenario Basis Confirmed: `Yes`. The test covers:
  - SCN-006: the model can't be obtained; explain and keep working (Supported Explicit Edge; REQ-010, AC-011);
  - AC-012 / QR-006: startup and Task writes don't touch search;
  - SCN-003: the tool's result states the unavailable meaning search.

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/projects/project-task-search-model-unavailable.e2e.test.ts` | Added in API/E2E round 1 (`8981a99256`); one line updated in IR-003 (`9f0df7eab3`) | SCN-006, SCN-003; AC-011, AC-012, QR-006, REQ-010 | The real embedding layer behind the production GraphQL and MCP transports when the model host can't be reached | Round 2 changed no durable test (`git diff 9f0df7eab3..HEAD` outside `tickets/` is empty). The IR-003 line takes the model folder from `DEFAULT_EMBEDDING_MODEL_ID` instead of a literal id; it is correct and weakens no assertion |

- No durable test file changed: round 1 `No` (API-D01, reviewed above); round 2 `Yes`.
  - `git diff --stat 600d079b9c..HEAD -- . ':!tickets'` is empty: API/E2E round 3 changed no durable test.
  - API-D01 is byte-identical to the version reviewed in round 1 (`git diff 9f0df7eab3..HEAD` on it is empty).
  - The base test `project-task-tools.test.ts`, changed in the merge, is implementation-owned and was reviewed in CRR-006.
- Review result when no durable test file changed: round 2 `Not Applicable`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | Two cases named by outcome and AC. The header states purpose, setup, what is simulated (only `fetch` to `huggingface.co`) and the command |
| Assertions prove approved requirements instead of incidental implementation details | Pass | They cover what the requirements ask for: exact matches kept; `UNAVAILABLE` with a reason naming the host; Task create, update and delete keep working and searches follow them; the tool note says "exact text matches only"; no self-retry (request count stays the same); Retry makes a new attempt. The "no `embeddings/` folder" check is a reasonable observable proxy for "startup … does not load the model or index anything" (AC-012), backed by zero model-host requests. Note: the closing "no `.part` file" assertion is trivially true here, because both simulated failures happen before a partial file is opened. The real case is covered by the `embedding-model-files` unit test. Harmless; no action |
| Fixtures, setup, helpers, and data builders reuse meaningful repetition | Pass | Reuses `startStudioE2eRuntimeServer` and the MCP session-authority pattern of the sibling search E2E. The local GraphQL helpers are small and specific to this file |
| Test isolation and determinism are appropriate for the exercised boundary | Pass | Each run gets a temp app-data root. `ENABLE_*`/`AUTOBYTEUS_*` variables are stripped and restored; the global `fetch` is replaced only for the model host and restored; the index is reset and shut down. The `DOWNLOADING done 0` expectation is deterministic: no files are present, so the readiness is set synchronously before the answer (O-1 path). `untilSettled` polls with a bound (≈ 5 s) |
| Large files remain coherent and navigable | Pass | 178 lines, one surface |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests remain | Pass | Complements, and doesn't duplicate, `project-task-search.e2e.test.ts`, which uses a stand-in index |
| Coverage agrees with the coverage investigation and execution evidence | Pass | API-D01 in the investigation and report; passed in the clean-environment Projects E2E folder run (36 tests) and in IMP-07 |
| Test callers and fixtures exercise an independently established scenario | Pass | SCN-006 and AC-011/AC-012 come from the approved requirements. The test reproduces them; it does not establish them |
| Each test enters through its scenario's real trigger and follows the real steps | Pass | It goes through real HTTP/GraphQL Task writes and searches, the real MCP `tools/call`, and the real `retryEmbeddingModel`. The only stand-in is the network failure (DNS failure, then HTTP 404), which is the supported trigger of SCN-006. Nothing hidden is mutated |

## Findings

None.

## Follow-ups

| Follow-up ID | What is wrong, where | Evidence | Why it is outside this ticket | Suggested Task description |
| --- | --- | --- | --- | --- |
| — | — | — | — | — |

- Sent to: `None`. API/E2E's C-10 idea (a frozen real-text fixture for the gated scale test) concerns the IR-003 test helper reviewed in CRR-004 as a non-blocking note. It is left to API/E2E or delivery to raise if wanted; it is not a test-review finding here.

## Latest Authoritative Result

- Result: `Not Applicable` (round 2: no durable test changed in API-REV-003). The round-1 `Pass` for API-D01 still holds, since the file is unchanged
- Changed durable test paths reviewed: none this round. Round 1 reviewed `autobyteus-server-ts/tests/e2e/projects/project-task-search-model-unavailable.e2e.test.ts`
- Unresolved finding IDs: none
- Recommended Recipient: `/software_engineering_team/delivery_engineer`
- Notes: residual risks carried from API-REV-003:
  - C-12: the AC-001 margin is 2.1 points on the real-text backlog;
  - C-10: the real-text backlog drifts with `tickets/done`;
  - untested: Windows, Linux and macOS x64 packaging, and Docker amd64;
  - RSK-002: downloads ignore HTTP proxies;
  - O-2: the setting appears in Advanced only once it has a value;
  - FU-5: the Docker image keeps the unpruned `onnxruntime-web`.

  C-14 was not observed in round 3. The two agent-status cadence cases that were out of scope in rounds 1–2 now pass on the new base.
