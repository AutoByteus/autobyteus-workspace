# API/E2E Test Review Report — autobyteus-460

## Review Meta

- Review Round: 1
- Trigger: API/E2E `Pass` (API-REV-001); two durable test files changed in `028e67f58d`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-002)
- Investigation Notes Reviewed As Context: through the design spec
- Solution Revision Record Reviewed As Context: SR-002 … SR-004
- Design Spec Reviewed As Context: `design-spec.md` (SR-004)
- Supplemental Task Artifacts Reviewed As Context: `evidence/api-e2e/API-05-agy-skill-definition-changes-excerpt.log`, `API-06-07-live-excerpt.log`, `API-05/API-05c-agy-github.json`, `live/live-skill-definition-codex_app_server.json`, `live/live-skill-definition-claude-approval.json`
- Architecture Review Revision Record Reviewed As Context: ARCH-REV-003
- Implementation Revision Record Reviewed As Context: IR-002
- Original Code Review Report: `code-review-report.md` (CRR-001, Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-002`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-001)
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: Pass
- Final Validation Confidence: 95%
- Prior unresolved test-review findings rechecked: none (first test review)
- Project testing guideline applied: `TESTING.md` (repository root). The tests follow its rules:
  - clean environment for E2E: the AGY file deletes the inherited `AUTOBYTEUS_*` roots and the runs used `env -i`;
  - throwaway `CODEX_HOME` and `GROK_HOME` holding only an `auth.json` symlink, plus `vi.unstubAllEnvs`;
  - every suite gated, including `RUN_GITHUB_PROXY_E2E` for real GitHub;
  - the scripted AGY CLI where a model is not needed, so no `agy` host-login history is written;
  - Codex model `gpt-6.1-terra` at medium effort;
  - test-vault credentials only;
  - the token is never written: evidence passes are masked, and the test asserts the token is not on the wire.
  No conflicts or discrepancies.
- Supported Product Scenario Basis Confirmed: `Yes` (SCN-001 … SCN-005 and AC-001 … AC-012 from the approved requirements)

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/agy-skill-definition-changes-transport.e2e.test.ts` | Added | SCN-001…005; AC-001, 003, 006, 007, 008, 009, 012 | Skill definition changes on Antigravity through the real Studio server with a scripted AGY CLI | 505 lines, three cases (API-05a/b/c), one surface |
| `autobyteus-server-ts/tests/e2e/runtime/live-skill-definition-changes.e2e.test.ts` | Updated | SCN-001, 002, 005; AC-001, 002, 003, 008, 011, 012; AR-003 | Live mid-run skill add and remove per runtime, plus the Claude case without auto-execute | Refactored into a `startRun` helper shared by both cases |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | Case names carry the API and AC IDs; numbered step comments follow the user's sequence (add → remove → stop → save while stopped → message) |
| Assertions prove approved requirements instead of incidental details | Pass | See the list below this table. |
| Fixtures, setup, helpers, and data builders reuse meaningful repetition | Pass | The live file's `startRun`, `waitReleased` and `writeEvidence` remove the per-runtime copies. The AGY file reuses the `until`, `sendE2eSendMessageCommand` and team-tree helpers, and keeps one `standalone` run helper. |
| Isolation and determinism appropriate for the boundary | Pass | Temp data roots, throwaway CLI homes, suites gated, owned cleanup checked in `afterAll`. Fixed waits are used in two kinds of place, discussed below this table; both fail loudly rather than pass falsely. |
| Large files remain coherent and navigable | Pass | The AGY file is one surface with three cases and documented helpers |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests | Pass | The live file's Claude-only branches became runtime-generic; the earlier step-4 terminate check was folded into steps 4 and 5; `it.skipIf` and `it.runIf` are gates with stated reasons |
| Coverage agrees with the coverage investigation and execution evidence | Pass | API-05a/b/c and the live runs match the report's AC proof rows. The receipts show the asserted lines: `API-05c-agy-github.json` has the restart sentence, then 200, then 403 `INTEGRATION_NOT_ALLOWED`, then 200. |
| Test callers and fixtures exercise an independently established scenario | Pass | Every case is an approved scenario (SCN-001…005, AC-009 team and copy, AC-006 and AC-007 GitHub) |
| Each test enters through the real trigger and follows the real actor's steps | Pass | See the list below this table. The scripted CLI replaces only the model. |

**Assertions.** They check what the requirements promise:
- the notice text, with its exact `SKILL.md` path, and one notice per input;
- the link exists before the next input;
- the link stays after a removal (DEC-007);
- the resume notice covers both changes, and an earlier-announced name is not repeated;
- "not woken": no new AGY launch and no notice frame;
- the integration results: 200, then 403 `INTEGRATION_NOT_ALLOWED`, and `RUN_PASS_INVALID` after stop;
- live runs answer the codeword.

Two facts are recorded but not asserted, which is correct:
- AGY not re-linking a skill added while stopped is FU-002;
- the Claude approval prompt, which AR-003 allows either way.

**Fixed waits.**
- The `wait(1_500)` negative "not woken" checks need a window.
- The `wait(3_000)` after a removal save has no observable server signal to wait on (removal makes no link). If the pass were late, the notice assertion would fail; it would not pass falsely.

**Real triggers.**
- The agents page save is the `updateAgentDefinition` GraphQL mutation.
- A package edit writes `agent-config.json` on disk, picked up by the folder feed.
- Messages go over the agent and team WebSockets.
- Stop is `terminateAgentRun`; the next message resumes the run.
- Delegation uses the real `delegate_task` and `send_message_to` tools.
- GitHub goes through the real `importIntegrations` and `connectIntegration` calls.
- Approvals are sent as `APPROVE_TOOL`, as the web sends them.

## Findings

None.

## Follow-ups

- Follow-ups this review added: None

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed:
  - `autobyteus-server-ts/tests/e2e/runtime/agy-skill-definition-changes-transport.e2e.test.ts`
  - `autobyteus-server-ts/tests/e2e/runtime/live-skill-definition-changes.e2e.test.ts`
- Unresolved finding IDs: None
- Recommended Recipient: `delivery_engineer`
- Notes: No run was repeated; every assertion could be judged from the diff and the recorded evidence.
