# API/E2E Test Review Report

## Review Meta

- Review Round: 2
- Trigger:
  - Round 1: `/software_engineering_team/api_e2e_engineer`, API/E2E **Pass** on IR-003 (API-REV-001, test commit `8aecb2030` on `1f2758614`).
  - Round 2: TR-001 / N-1 fix (API-REV-002, `a55b727dc`). The re-review covers only the changed lines.
- Requirements Doc Reviewed As Context: `requirements-doc.md` (REQ-012 / AC-012, BEH-008, SCN-014, DEC-001)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (OBS-003)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-003..SR-005)
- Design Spec Reviewed As Context: `design-spec.md` (D-4, append states)
- Supplemental Task Artifacts Reviewed As Context: `probes/task-close-during-delivery.probe.ts`
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md` (IR-002, IR-003)
- Original Code Review Report: `code-review-report.md` (CRR-002 Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-004`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-001)
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: Pass
- Final Validation Confidence: 95%
- Prior unresolved test-review findings rechecked: TR-001 (resolved), N-1 (done)
- Project testing guideline(s) applied: `TESTING.md` (rules 6 and 9; suite map). No conflicts.
- Supported Product Scenario Basis Confirmed: `Yes`. The trigger is SCN-014, a Task marked DONE by another agent through `create_or_update_task`, which is an approved scenario under DEC-001.

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/projects/teammate-delivery-task-closure-race.e2e.test.ts` | Added | TDR-001..003: REQ-012 / AC-012, CR-001, history continuity | A Task closure racing a teammate message save, through real server boundaries, in all three roots | 501 lines; one coherent surface |
| `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` | Updated | Supports TDR | Opt-in `AGY_FAKE_TOOL_TIMEOUT_MS` and `AGY_FAKE_TOOL_LOG`; default behavior unchanged | Clean, documented |
| `TESTING.md` | Updated | — | Suite map entry and run command | Accurate |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | Header maps TDR-001..003 to REQ-012 and CR-001; one `it.each` per root |
| Assertions prove approved requirements instead of incidental details | Pass (round 2; round 1 Fail on TR-001) | Most assertions prove REQ-012 directly: server-side `TaskDelegationError TASK_AGENT_RESOURCE_CLOSED`; record kept or not written; the recipient never processes; snapshot equals history; restore equals pre-stop. The exception is the "blocking message" agent-visible check, which asserts a different call (TR-001) |
| Fixtures, setup, helpers reuse meaningful repetition | Pass | Same root/connect/conversation helpers as the sibling DTL suite; `holdWrite` / `gateStore` / `spyDeliveries` are small and named |
| Isolation and determinism fit the boundary | Pass, with a note | Disposable data dir; prototypes restored; owned cleanup asserted; unique markers. The race window is opened deterministically at the store, and closure is observed in the Task's own record before release. TDR-002 now asserts that B's delivery started before Task B closed (N-1, round 2) |
| Large files coherent and navigable | Pass | — |
| No stale/duplicated/disabled-without-reason tests | Pass | Gated by `RUN_AGY_FAILURE_E2E`, like its siblings |
| Coverage agrees with investigation and execution evidence | Pass | Ledger TDR-001..003; six runs; fails on base `46e94fdea` (the Agent root shows the exact CR-001 symptom) |
| Callers and fixtures exercise an independently established scenario | Pass | REQ-012 / SCN-014 is approved. The store gate only widens a real race window (equivalent to a slow disk write); it does not fabricate state |
| Each test enters through its real trigger and actor steps | Pass | The Manager's real `send_message_to`; a member's real teammate message; another root's agent marks the Task DONE through the real Task tool; real root stop and restore. The server-side spy on `RootCommunicationEngine.deliver` is read-only, and it is justified because the MCP layer turns thrown errors into an opaque `-32603` (pre-existing, recorded as API/E2E observation 1) |

## Findings

No open findings (round 2).

**TR-001: resolved in round 2 (`a55b727dc`).**
- `toolOutcome` now matches exactly one `send_message_to` call by `arguments.content ===` the given content plus the intended target (`target_agent_run_id` or `recipient_address`).
- The blocking assertion also requires `target_agent_run_id` = A's mate.
- Receipt `api-e2e-evidence/tdr-run7/…json`: `blockerAgentSaw.target_agent_run_id` equals A's mate and `mateAgentRunId` in all three roots (reviewer-checked).

**N-1: done.** The spy records the delivery start. TDR-002 asserts that B's delivery started before Task B closed (about 3.06 s earlier in every root). Strictly, this proves the delivery was in flight, not the exact moment its slot was reserved. Reservation follows the start within the same delivery, and the sender's outcome arrives only after the write release, so this is sufficient.

Round-1 record:

| Finding ID | Test Path / Scenario | Evidence | Required Action | Classification / Owner |
| --- | --- | --- | --- | --- |
| TR-001 | `teammate-delivery-task-closure-race.e2e.test.ts`, TDR-002 blocking message; `toolOutcome(marker)` (L125-130) and `awaitToolOutcome(blocker, "A lead's teammate message result")` (L454, asserted at L459) | `toolOutcome` returns the **first** tool-log line whose arguments contain the marker. The Manager's earlier call to A's lead embeds the blocker marker inside its `content` (L439-440), so it matches first. The passing receipt `api-e2e-evidence/tdr-run6/teammate-delivery-task-closure-race.json` confirms it: in all three roots, `tdr002.blockerAgentSaw.target_agent_run_id` is **A's lead** (for example Agent root `…fd15c43e72a5` = `copyA.lead`), not A's mate. So the assertion labelled "blocking message accepted" re-checks the Manager → lead call, and the receipt field is mislabelled. The requirement itself is still proven by `deliveryOutcomes.get(blocker)` resolved `accepted: true` (L460) and `answered(copyA.members.mate, blocker)` (L461) | Match the outcome to the intended call, for example by `arguments.content === marker` (or `startsWith`) together with the expected `recipient_address`, instead of a substring anywhere in the arguments. Rerun the suite and confirm `blockerAgentSaw.target_agent_run_id` is A's mate. Correct any coverage-report wording that cites this value | `Local Fix` → `/software_engineering_team/api_e2e_engineer` |

### Notes (non-blocking)

- **N-1 (optional, same edit).** TDR-002 shows the B message was waiting for the history lock with a held slot when the Task closed only by elapsed time: `wait(3_000)` plus the timeline. Recording the delivery start time in the `spyDeliveries` wrapper, and asserting that the raceB delivery started before the "task closed" mark, would make the CR-001 case prove its own precondition rather than relying on the base-discrimination run.
- **N-2.** The agent-visible `protocolError: -32603` assertions (L429, L458) pin the current opaque MCP error behavior. That is correct today. If the separate-ticket candidate (a structured `send_message_to` result) is ever done, these assertions are expected to change with it.

## Latest Authoritative Result

- Result: `Pass` (round 2)
- Changed durable test paths reviewed:
  - `teammate-delivery-task-closure-race.e2e.test.ts`
  - `agy-failure-cli.mjs`
  - `TESTING.md`
- Unresolved finding IDs: None
- Recommended Recipient: `/software_engineering_team/delivery_engineer`
- Notes:
  - The round-2 rerun passed 3/3 roots (`tdr-run7`).
  - The fixture and `TESTING.md` pass unchanged.
  - N-2 remains informational.
