# API/E2E Test Review Report — agent-initiated-collaborators

## Review Meta

- Review Round: 1 (proportional test-code review)
- Trigger: API/E2E `API-REV-003` passed at 96% on IR-003 @ `7ae1335c8` (SR-007)
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-007, including REQ-012/AC-013)
- Investigation Notes Reviewed As Context: `investigation-notes.md`
- Solution Revision Record Reviewed As Context: `solution-revision-record.md`
- Design Spec Reviewed As Context: `design-spec.md` (SR-007)
- Supplemental Task Artifacts Reviewed As Context: the predecessor's VIS-001–015 (unchanged UI)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md` (ARCH-REV-005)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md` (IR-003)
- Original Code Review Report: `code-review-report.md` (round 5 Pass, CRR-006)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-007`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md` (round 3, authoritative)
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-001…003)
- Delivery Revision Record Reviewed As Context: `N/A`
- API/E2E Result: Pass
- Final Validation Confidence: 96%
- Prior unresolved test-review findings rechecked: none (first test review for this ticket)
- Supported Product Scenario Basis Confirmed: `Yes`. The scenarios are SC-001–005, UC-001–005, AC-001–013 and RS-003 (the race).

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/agent-initiated-collaborators.e2e.test.ts` | Added (round 1), extended (rounds 2–3) | LE-A1 (AC-001–004/008/010), LE-A2 (AC-005/007, restore), LE-A3 (AC-013 standalone), LE-T1 (Team root: CR-001 scope, AC-006/012/013, race, reopen), LE-O1 (Org: SC-003, AC-012/013, reopen), LE-F1 (SC-004) | Live agent-initiated collaborator journeys per runtime, gated by `RUN_*_E2E` (root cases by `AIC_ROOT_RUNTIMES`) | 1091 lines, but coherent: one feature surface organized by case ID with AC-commented steps and shared helpers |
| `autobyteus-server-ts/tests/e2e/runtime/standalone-agent-collaborator-mention.e2e.test.ts` | Updated (round 1) | Predecessor AC-014 under this ticket's REQ-005 | The first-turn `delegate_task` now targets an unknown address, asserts the new reason text, and asserts that no task execution was created | Correct update: under REQ-005 a listed catalog address would start a copy |

- No durable test file changed: `No`
- No removals.
- **Not durable code (evidence only):** `api-e2e-evidence/probes/*.mjs` and `api-e2e-evidence/desktop/*.mjs`.

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | `it` titles carry the case ID and outcome (for example "LE-A3 Agent root — a collaborator-team member's top-level copy is placed at the root…"). Steps are commented with AC/REQ/SC IDs. |
| Assertions prove approved requirements instead of incidental details | Pass | Covered: list shape, opt-in, `@` parity and hashed twin addresses; no write on list; bring-in run IDs and reuse in both orders; copies carry `source` and no collaborator is added; `get_handoff_rules` names the copy's own mate, which is reached before the report; catalog Agent copies get no scope; stored placement paths (`rootOrg.taskExecutions`, team `taskExecutions`), including after reopen; SC-004 reason, nothing added and no package. |
| Fixtures, setup, helpers and data builders reuse meaningful repetition | Pass | Shared `gql`/`waitFor`/`poll`, `callTool`/`operatorPrompt`, `rulesOf`/`instructionsOf`, the squad and definition builders, and the stored-path helpers |
| Test isolation and determinism appropriate for the boundary | Pass | Temp data root per run; per-runtime gates; bounded polling. A few fixed `wait(3_000)` calls after reopen are acceptable for a live boundary. **Secrets:** `DEEPSEEK_API_KEY` is read from the process environment only (never from a user `.env` file) and stored through the existing vault helper inside the temp data root; the vault is closed in `afterAll`. |
| Large files coherent and navigable | Pass | One feature surface; cases separated; helpers grouped at the top |
| No stale, duplicated, disabled-without-reason or compatibility-only tests | Pass | Runtime-dependent skips are explicit and documented. Instruction checks run only where `SYSTEM_INSTRUCTIONS_SUPPLIED` is emitted (Claude), guarded by `if (instructionsVisible)`, so they never pass falsely. The prompt composer itself is pinned by unit tests. |
| Coverage agrees with the coverage investigation and execution evidence | Pass | The round-3 report lists LE-A1/A2/A3/T1/O1/F1 per runtime (Claude, Codex, AGY, AutoByteus over DeepSeek); Grok is blocked by quota and reported as such |
| Test callers and fixtures exercise an independently established scenario | Pass | SC-004 uses a run whose model the runtime accepts but the catalog doesn't offer. That reproduces the supported explicit edge ("model left the catalog") without hidden-state mutation; the predecessor covered the Settings-driven variant. Old-rule stored placements were exercised only by a temporary probe, not durable code. |
| Each test enters through its real trigger and follows the real actor's steps | Pass | Real `send_message_to`, `delegate_task` and `list_available_agents` tool calls by agents over the runtime streams; `@` via SEND_MESSAGE `mentions`; Stop → reopen via the product APIs (`restoreAgentOrgRun` for Org). The Codex `tool_search` and AGY `view_file` prompt hints only work around the runtimes' tool surfacing (O-1/O-2); they don't bypass the product path. |

## Findings

None.

Minor, non-blocking: the `INSTRUCTIONS_NOT_EMITTED` sentinel is effectively unreachable, because every use is guarded by `instructionsVisible`. It is harmless and can be simplified opportunistically.

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed: 2 (1 added, 1 updated, 0 removed)
- Unresolved finding IDs: none
- Recommended Recipient: `/software_engineering_team/delivery_engineer`
- Notes:
  - Source review: Pass (CRR-006). API/E2E: Pass at 96% (API-REV-003).
  - The worktree holds API/E2E's uncommitted durable tests and the uncommitted ticket artifacts for delivery to commit.
