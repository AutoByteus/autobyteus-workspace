# API/E2E Test Review Report — autobyteus-53 (`stopped-run-unavailable-model`)

## Review Meta

- Review Round: 1
- Trigger: API/E2E pass (API-001) from `/api_e2e_engineer`, commits `cef4f79481`, `65908ec19e`, `89cd9be21b`, `e6380c2acf`, `8bb256873c`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-006)
- Investigation Notes Reviewed As Context: `investigation-notes.md`
- Solution Revision Record Reviewed As Context: `solution-revision-record.md`
- Design Spec Reviewed As Context: `design-spec.md` (SR-006)
- Supplemental Task Artifacts Reviewed As Context: N/A — not applicable
- Architecture Review Revision Record Reviewed As Context: ARCH-REV-002
- Implementation Revision Record Reviewed As Context: IR-002
- Original Code Review Report: `code-review-report.md` (CRR-002, `Pass`)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-003`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-001)
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: `Pass`
- Final Validation Confidence: 95.3%
- Prior unresolved test-review findings rechecked: None (first test review). The CRR-002 non-blocking note on the Org unit test is addressed in this round.
- Project testing guideline(s) applied: root `TESTING.md` (built-server E2E gate `RUN_AGY_FAILURE_E2E=1`, clean `env -i`, test-owned data root and HOME, Rule 9 baseline fixes as their own commit). No conflicts found.
- Supported Product Scenario Basis Confirmed: `Yes` (SCN-001..SCN-005; a provider model removed from LM Studio is a supported operational event)

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/native-model-handover-built-server.e2e.test.ts` | Added (MH-01..MH-06) | AC-001..AC-006, AC-008, AC-010; DEC-005, DEC-007, DEC-008, DEC-009; CR-001 | A native model hand-over of a stopped run on the built server: standalone, Team, Org | Gated as TESTING.md requires; the header lists purpose, prerequisites, run command and cases |
| `autobyteus-server-ts/tests/e2e/helpers/org-run-tree.ts` | Added | AC-007 (existing Org switch suites) | Reads an Org run's composed tree plus each member's own pending switch and launch source | Shared by the three repaired suites |
| `runtime-switch-members-built-server.e2e.test.ts` (MS-04), `runtime-switch-members-extended-built-server.e2e.test.ts` (EX-01), `agy-switch-back-built-server.e2e.test.ts` (SB-01) | Updated (baseline fix, `cef4f79481`) | AC-007 | Unchanged scenarios; they now read the Org container's composed tree instead of the Org file, which no longer holds members | TESTING Rule 9, its own commit |
| `autobyteus-server-ts/tests/unit/agent-org-execution/agent-org-run-manager-model-selection-save.test.ts` | Updated | BEH-005 for Org members | The same-session case is a real edit (`equal` → `large`), expecting `UPDATED` | Closes the CRR-002 note |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | One case per surface or rule area; names state the trigger and outcome. Non-blocking: the header lists MH-05 and MH-06 before MH-03, unlike the file order |
| Assertions prove approved requirements instead of incidental implementation details | Pass | Exact marker text (DEC-008); the notice before the user text; the request's `model` and the absence of earlier conversation (a fresh session); the archived segment holds exactly the previous records (I-7); `pendingRuntimeSwitch.from` on disk; `platformAgentRunId` kept or cleared; the Save message (AC-010); the options list every offered model with `currentModel: null` |
| Fixtures, setup, helpers, and data builders reuse meaningful repetition | Pass | `talk`, `attempt`, `save`, `removeModel` and the stream adapters are reused across cases. `org-run-tree.ts` removes a three-way duplication |
| Test isolation and determinism are appropriate for the exercised boundary | Pass | Each case uses its own `gone-*` model and run; `removeModel` asserts that the catalog dropped the model; one owned server and data root, cleaned up in `afterAll`; 6/6 in `MH-final.log` |
| Large files remain coherent and navigable rather than mixing unrelated scenarios | Pass | 673 lines, one behavior (native model hand-over) across its surfaces |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests remain | Pass | The three stale Org suites are repaired, not skipped. EX-01's changed assertion (a native direct Org Agent's session is its run ID) matches pre-existing source: the native backend reports its run ID as its session (`autobyteus-agent-run-backend.ts:199-201`), and the standalone lifecycle persists it. It is not a weakening caused by this ticket |
| Added, updated, and removed coverage agrees with the coverage investigation and execution evidence | Pass | `MH-final.log` 6/6. Mutation checks: dropping the writer's `platformAgentRunId` fails MH-04 with `PERSISTENCE_INDETERMINATE`, and making "equal or bigger" always true fails MH-02. The repaired suites pass 13/13 (`AC007-org-switch-suites-after-baseline-fix.log`). Reviewer rerun: the unit file passes 3/3 |
| Test callers and fixtures exercise an independently established supported scenario rather than proving one by themselves | Pass | A model removed from LM Studio (SCN-001), a smaller model (SCN-005), unverified capacity (SCN-003), a restart, and an archive failure, the last as in the existing switch suites |
| Each test enters through its scenario's real trigger and follows the real actor's or event's steps, without a setup real use does not produce | Pass | Runs are created, run, stopped, saved and messaged through GraphQL and WebSocket on `dist/app.js`. The model is removed at the scripted provider and the catalog is reloaded as Settings does. The verified-capacity models come from a custom OpenAI-compatible provider created through the API |

## Findings

None.

Non-blocking notes:
- The file header's case list order (MH-05, MH-06, then MH-03) differs from the file order. This is cosmetic.
- As FU-001 records, "equal or bigger keeps the session" is proven end to end only for models with a verified capacity (a custom endpoint's), because real LM Studio models carry no verified capacity in the rule's catalog. MH-05 documents that behavior.

## Follow-ups

- Follow-ups this review added: None. FU-001 (API/E2E) is already in `follow-ups.md`.

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed: `native-model-handover-built-server.e2e.test.ts`, `helpers/org-run-tree.ts`, the MS-04 / EX-01 / SB-01 baseline fixes, `agent-org-run-manager-model-selection-save.test.ts`
- Unresolved finding IDs: None
- Recommended Recipient: `/delivery_engineer`
- Notes: the durable tests prove AC-001..AC-006, AC-008, AC-010 and the CR-001 path on the built server. AC-011 (user check on a beta, including the rendered Settings menu and help text) remains for delivery.
