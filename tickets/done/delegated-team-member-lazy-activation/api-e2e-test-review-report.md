# API/E2E Test Review Report

## Review Meta

- Review Round: 1. This is the first proportional test review for this package. API-REV-001 failed and went to failure-origin review, so no test review ran then.
- Trigger: `/software_engineering_team/api_e2e_engineer`, API/E2E **Pass** on IR-003 (API-REV-002, HEAD `520c53dc7`)
- Requirements Doc Reviewed As Context: `requirements-doc.md` (REQ-001..007, AC-001..007, QR-001)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (AINV-013)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-002..SR-004)
- Design Spec Reviewed As Context: `design-spec.md` (DS-001, DS-002 corrected, DS-005, SR-004)
- Supplemental Task Artifacts Reviewed As Context: None
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md` (ARCH-REV-002)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md` (IR-003)
- Original Code Review Report: `code-review-report.md` (CRR-003, Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-004`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-001, API-REV-002)
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: Pass
- Final Validation Confidence: 95%
- Prior unresolved test-review findings rechecked: None (no prior test review)
- Project testing guideline(s) applied: `TESTING.md` (repository root). Rule 9 applies to the baseline fixes; rule 2 applies to isolated data and HOME. No conflicts with this skill.
- Supported Product Scenario Basis Confirmed: `Yes`. Every case maps to an approved SCN/AC: SCN-001..005, AC-001..006, QR-001.

## Changed Durable Test Scope

Scope covers every durable test change made by API/E2E across API-REV-001 and API-REV-002: commits `c95ad4b92`, `fecc0c047` and `520c53dc7`. The unit tests changed by implementation (IR-001..003) were reviewed in CRR-003 and are not repeated here.

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/projects/delegated-team-lazy-member-activation.e2e.test.ts` | Added (API-REV-001), Updated (API-REV-002) | DTL-001..009: AC-001..005, QR-001, REQ-004/005/006 | Lazy member activation of delegated Team copies through the real server, MCP, Task and lifecycle boundaries, for all three roots | 625 lines; one coherent surface |
| `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` | Updated | AC-004 (DTL-003 / DTL-008) | Scripted AGY CLI. `AGY_FAKE_EXTRA_MODELS` offers a model only while set (simulates a provider retiring a model) | Default output unchanged |
| `autobyteus-web/tests/e2e/task-closure-tree-probe.mjs` | Updated | AC-001 / REQ-003 (rendered status; web-equivalent of AC-007) | `memberRowStatus` plus the BR-008..010 lazy-member render check | Live browser probe |
| `TESTING.md` | Updated | — | Suite map entry, run command, `graceShutdownAccepted` and live-Claude HOME notes | Docs for tests |
| `tests/integration/agent-team-execution/configured-scope-readiness.test.ts` | Updated (baseline fix) | AC-006 | Doubles moved to the current `beginActivation` contract | Failed identically on base |
| `tests/integration/agent-team-execution/agent-team-run-manager.integration.test.ts` | Updated (baseline fix) | AC-006 | `beginMaterialization` contract; callback key list | Failed identically on base |
| `tests/integration/agent-team-execution/team-agent-tools-mcp-lifecycle.integration.test.ts` | Updated (baseline fix) | AC-006 | `testBackendFactory` over the existing backend doubles | Failed identically on base |
| `tests/integration/agent-team-execution/team-conversation-target-websocket.integration.test.ts` | Updated (baseline fix) | AC-006 | Snapshot shape updated to the current fields | Failed identically on base |
| `tests/e2e/agent-org-runs/controlled-org-publication-http.e2e.test.ts` | Updated (baseline fix) | AC-006 | Collaborator admission via `send_message_to`; an in-run definition stays an `@` candidate | Matches the documented policy (`collaborator-candidate-policy.ts:73-76`) |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | DTL IDs map to AC/REQ in the header comment and in inline step comments. Three `it` blocks: the per-root lifecycle scenario, coordinator failure (DTL-008), and live Claude (DTL-009). |
| Assertions prove approved requirements instead of incidental details | Pass | They assert observable contracts:<br>• the provider launch log (exact session count, `--conversation` binding);<br>• saved `platformAgentRunId` in every saved tree record;<br>• `agent_statuses` in a fresh view snapshot (what the sidebar renders);<br>• the tool result to the sender (`AGENT_RUN_ACTIVATION_FAILED` naming `AGY_MODEL_UNAVAILABLE`);<br>• exactly one conversation `ERROR` card.<br>The web probe asserts rendered row status. |
| Fixtures, setup, helpers, and data builders reuse meaningful repetition | Pass | `startRoot` (per-kind root with view, conversation readers, tool-call driver), `delegateCopy`/`copyOf`, `memberCalls`, `expectStatuses`, `savedBindings`, `launchesFor`. Reuses the shared E2E helpers (`startStudioE2eRuntimeServer`, `until`, `flattenE2eConfiguredAgentExecutions`). |
| Test isolation and determinism are appropriate for the boundary | Pass | Disposable data dir and HOME; env restore; owned cleanup asserted, including no leftover AGY processes; unique definition names. Timing tolerance is bounded and evidenced (see note N-1). |
| Large files remain coherent and navigable | Pass | 625 lines, one behavior surface (lazy activation across roots and lifecycle). No unrelated scenarios. |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests remain | Pass | DTL-009 is skipped only behind an explicit opt-in gate (`RUN_CLAUDE_E2E` plus a logged-in `claude`). Baseline fixes update stale doubles and assertions to current contracts rather than deleting coverage. |
| Coverage agrees with the coverage investigation and execution evidence | Pass | The ledger lists DTL-001..009 and BR-008..011, and the execution report records 6 full runs. DTL-003 failed on API-REV-001 and passed on API-REV-002, as the code review predicted. |
| Test callers and fixtures exercise an independently established supported scenario | Pass | Every case maps to an approved SCN. `AGY_FAKE_EXTRA_MODELS` reproduces a real provider event (a model retired after configuration) without fabricating handle state. |
| Each test enters through its scenario's real trigger and follows the real steps | Pass, with one justified exception | The real triggers are:<br>• the Manager's `delegate_task` through scoped MCP;<br>• a member's `send_message_to`;<br>• `create_or_update_task` DONE/TODO;<br>• root terminate/restore;<br>• a real idle grace period.<br>The exception is DTL-007, which edits the saved tree file to the pre-fix shape. That data was produced by real use of pre-fix versions, which current code cannot produce. REQ-006 / AC-005 explicitly require restoring such copies, so the edit is the representative way to stage it. |

### Notes (non-blocking, no action required)

- **N-1 (`expectStatuses` grace tolerance).** An expected-`idle` member may read `offline` only when all of these hold:
  - its last non-offline signal was `idle`;
  - that signal was at least `GRACE_MS − 2 s` ago;
  - its process is gone.

  So an early or wrong shutdown is not masked. Each acceptance is recorded in the receipt (`graceShutdownAccepted`), and 0 occurred in round 2. This is proportionate for a 60 s real grace on a loaded host.
- **N-2 (DTL-003 "exactly one card").** The test counts cards after a 1 s settle window. A late duplicate after that window would go unseen. The handle unit tests (CRR-003) prove "one card per failed start" deterministically, so this is acceptable.
- **N-3 (HOME under `RUN_CLAUDE_E2E=1`).** With the flag set, the **whole** suite, including the scripted AGY cases, runs under the real `HOME`, not only DTL-009. `TESTING.md` says "that case uses your real HOME". In this suite's flows the scripted CLI writes into `HOME` only for `BACKGROUND_STEP`, which is unused, so there is no practical pollution. The wording could be made exact in a later touch, for example: "with `RUN_CLAUDE_E2E=1` the suite runs under your real HOME". Not required.
- **N-4 (web probe colour mapping).** `memberRowStatus` maps the dot's Tailwind colour class to a status for Agent/Team rows, and uses `data-status` for Org rows. That is coupled to styling, but it is exactly the user-visible "gray Offline" that DEC-001 = A requires.

## Findings

None.

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed:
  - `delegated-team-lazy-member-activation.e2e.test.ts`
  - `agy-failure-cli.mjs`
  - `task-closure-tree-probe.mjs`
  - `TESTING.md`
  - the five baseline-fix test files
- Unresolved finding IDs: None
- Recommended Recipient: `/software_engineering_team/delivery_engineer`
- Notes:
  - No API/E2E rerun was needed; every assertion could be judged from the diff and the recorded evidence.
  - Carried for Delivery:
    - `docs/modules/agent_team_execution.md:247-248` (removed option);
    - optionally, document `AGENT_RUN_ACTIVATION_FAILED`;
    - N-3 wording;
    - `typecheck` TS6059 fails on base too;
    - untracked build outputs.
  - AC-007 still needs the user's check in the desktop app.
  - Follow-up cleanup ticket brief: `followup-cleanup-ticket-brief.md`.
