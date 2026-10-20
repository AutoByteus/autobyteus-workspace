# API/E2E Test Review Report — autobyteus-191 Slice 1: Remote Delegation, Text Only

`…` = `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-node-agent-communication-r2/tickets/in-progress/cross-node-agent-communication`

## Current Result — Round 3 (CRR-010): Not Applicable

- Trigger: API/E2E round 5 Pass (API-REV-005, on the integration merge `c59c6f7359`, HEAD `2155dc1aef`; evidence commit `2db0190aa1`).
- Changed durable test paths this round: none.
  - `2db0190aa1` changes only ticket documents and evidence.
  - The E2E file is unchanged since `a777af6b1d` (CRR-008).
  - The test diffs between `a777af6b1d` and `2db0190aa1` come from the merged `origin/personal` (autobyteus-205; reviewed in its own ticket) and from the IR-005 implementation test `300bf4c09a`, which was reviewed with source in CRR-009.
- No durable test file changed: `Yes`. Result: `Not Applicable`.
- Evidence noted, not reviewed as test code:
  - r5-1 and r5-2: 20/20 each on a dist rebuilt at the merge;
  - API-22: 36/37, the one failure FU-003 at the same lines as before.
- Recommended Recipient: `/software_engineering_team/delivery_engineer`

## Earlier Result — Round 2 (CRR-008)

- Trigger: API/E2E round 4 (API-REV-004, commit `a777af6b1d`). Delivery's DR-001 / DEL-06 saw RC-10 fail once under load on the integrated state (HEAD `303eb6ca1d`, which includes the `origin/personal` merge `4f03cce09d`).
- Changed durable test path: `autobyteus-server-ts/tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts`, updated in `a777af6b1d`. The commit touches only test code and evidence; no source changed.
- Prior notes rechecked (CRR-007), all three addressed:
  - the header now says "About 2–3 minutes", and the round-4 runs took 140 s and 148 s;
  - definition IDs are in a separate `defs` record and `ids` holds run IDs only. Grep: no `ids.delegator`, `ids.publisher`, `ids.fragile`, `ids.worker` or `ids.manager` remains;
  - RC-06 and RC-07 assert `sequenced > 0`, and RC-05 explains why its view carries no sequence.

### RC-10 race fix

- **Cause, agreed: a test race, not a product defect.**
  - The old RC-10 found the remote run by scanning beta's folders for `delegatedFrom`. Beta writes that file when it prepares the run, before the work packet activates it (SR-014 order).
  - A prepared run is not an admitted package, so its projection answers "unavailable" until it starts. That is existing behavior for prepared runs, and no real user follows a remote run on B before its packet.
  - The test's `until()` let the error escape instead of retrying.
- **Fix: the test now follows the real actor.**
  - RC-10 reads the remote run ID from the task agent's own `delegate_task` result. That result returns only after `acceptSeed` delivered the work packet, the same way RC-05 … RC-07 obtain their IDs.
  - No assertion is weaker. The result's `delegated: true`, `node` and missing `task_id` are asserted before use. `delegatedFrom` is still checked exactly, which binds `r3` to `workerRunId` and the manager's root, and the Task record and link assertions are unchanged.
- **Evidence.** Both r4-1 and r4-2 pass 20/20 at load average 100–157. In both receipts:
  - `RC-10.workerResult.target_agent_run_id` equals `r3`;
  - RC-06 has 99 and RC-07 has 83 sequenced frames, with `gaps: []`;
  - RC-20 audits 44 clean requests;
  - cleanup is clean.

### Evidence correction (AC-110)

- The duplicate `API-23-beta-composer-message.png` (byte-identical to the history PNG, a stale frame) is removed. It is replaced by API-23b from two isolated desktop instances of the integrated build, with real runtimes, watched by the user.
- `API-23b-isolated-beta-composer-message.png` (a distinct hash) shows:
  - the remote run under `node-b-workspace → Text Reviewer (1)`;
  - its `send_message_to` back to node A;
  - the owner's composer message `OWNER-COMPOSER-MSG` and the run's answer.

  It matches `API-23b-isolated-app-journey.log`.
- Evidence only; no durable test code is involved.

### Result

- Result: `Pass`. No findings; the CRR-007 notes are resolved.
- Recommended Recipient: `/software_engineering_team/delivery_engineer`

## Earlier Result — Round 1 (CRR-007)

## Review Meta

- Review Round: 1
- Trigger: API/E2E round 3 Pass (API-REV-003, code `7a5a9af077`, evidence commit `78820ad2a0`)
- Requirements Doc Reviewed As Context: `…/requirements-doc.md` (AC-101 … AC-113)
- Investigation Notes Reviewed As Context: as cited by the coverage investigation
- Solution Revision Record Reviewed As Context: `…/solution-revision-record.md` (SR-014 … SR-017)
- Design Spec Reviewed As Context: `…/design-spec.md` (SR-017)
- Supplemental Task Artifacts Reviewed As Context: `…/follow-ups.md` (FU-002 … FU-004)
- Architecture Review Revision Record Reviewed As Context: `…/architecture-review-revision-record.md`
- Implementation Revision Record Reviewed As Context: `…/implementation-revision-record.md` (IR-004)
- Original Code Review Report: `…/code-review-report.md` (CRR-006 Pass)
- Code Review Revision Record: `…/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-007`
- Coverage Investigation: `…/api-e2e-coverage-investigation.md`
- Execution Coverage Report: `…/api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `…/api-e2e-revision-record.md` (API-REV-001 … API-REV-003)
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: `Pass`
  - two-server E2E 20/20 in r3-3 and r3-4;
  - AC-112 regressions with pre-existing failures only (FU-003, FU-004, both reproduced on base);
  - AC-113 left to the user.
- Final Validation Confidence: 95% (reported by API/E2E)
- Prior unresolved test-review findings rechecked: none (first test-code review)
- Project testing guideline applied: `TESTING.md`.
  - Gated runtime suites carry their gate and command in the file header.
  - Clean environment (`env -i`).
  - Test-owned temp data and ports only; stop what you started; assertions first.
  - No conflict with this skill.
- Supported Product Scenario Basis Confirmed: `Yes` (SCN-101 … SCN-109 through AC-101 … AC-111)

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts` | Added (`2f60c233a8`), updated (`a3fe225343`, `78820ad2a0`) | AC-101 … AC-111, QR-102, REQ-113/114; SCN-101 … SCN-109 | Remote collaboration slice 1 between two real server processes: settings and gateway, delegation and messaging from all three root kinds, lifecycle (idle, restarts, closure, deletion), link failures, withdrawal, and an audit of the requests between the nodes | 1,116 lines, one coherent surface, ordered cases RC-01 … RC-20 sharing two nodes. Gated by `RUN_AGY_FAILURE_E2E=1` + `ANTIGRAVITY_CLI_COMMAND` + a current `dist`. |

- No durable test file changed: `No`

The other unit tests in this branch were reviewed with the source in CRR-001 … CRR-006. Evidence logs, receipts, screenshots and probe scripts under `evidence/` are evidence, not durable test code.

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | Each `it` names its RC ID, the criteria and the expected outcome. The header maps every RC to its criteria and states the shared-state order and the subset that runs alone (`-t "RC-(01\|03\|20) "`). |
| Assertions prove approved requirements instead of incidental implementation details | Pass | They assert agent-visible texts and codes (REQ-109), exact on-disk key sets (§ On-Disk Data Model), one message ID in both logs (CM-9, REQ-108), `delegatedFrom` and links surviving restarts (RSK-108), restore via `--conversation` relaunch (REQ-107), elapsed bounds (QR-102), and captured request fields with no credentials and no canary (AC-111). RC-13 asserts the F-002 outcome directly: reply delivered, delegator relaunched, runs reopen after a new root re-scans, follow-ups in both logs. |
| Fixtures, setup, helpers, and data builders reuse meaningful repetition | Pass | `NodeServer`, `CapturingProxy`, actors (`standaloneActor` / `teamActor` / `orgActor`), `calls` / `receives` / `neverReceives`, `assertBothLogs`, `sequenceCheck` and `remoteLinksIn` remove the repetition. It reuses `flattenE2eConfiguredAgentExecutions` and `buildE2eClientCommandIds` from the shared E2E helpers. |
| Test isolation and determinism are appropriate for the exercised boundary | Pass | Its own temp root, free ports and HOMEs; `env -i` for the server processes; the scripted AGY CLI (no inference). The polling `until` has bounded timeouts. The partition, retarget and switch-off cases restore state in `try/finally`. `afterAll` stops both servers and proxies, checks for leftover AGY processes and removes the root. The receipts record `cleanup: {rootRemoved: true, serversStopped: true, leftoverAgy: [], errors: []}`. The ordered shared state is deliberate (two real nodes) and documented. 20/20 in three of four round-3 runs; the one failure was a heuristic in RC-20 that is now fixed. |
| Large files remain coherent and navigable rather than mixing unrelated scenarios | Pass | One surface (two-node remote collaboration), with helpers first, then RC cases in requirement order. |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests remain | Pass | No `skip` or `only` beyond the documented gate. The RC-03 not-AutoByteus check is `expect.soft`, which still fails the test, and it now passes (CR-002). |
| Added, updated, and removed coverage agrees with the coverage investigation and execution evidence | Pass | The report's Cases table and Acceptance-Criteria Proof map to RC-01 … RC-20. Receipt `API-r3-run4`: RC-06 99 and RC-07 83 sequenced frames with no gaps; `RC-13.observed` and `.reopened` as the report states. |
| Test callers and fixtures exercise an independently established supported scenario rather than proving one by themselves | Pass | Every case traces to an approved SCN or AC. RC-08's forged inbound requests and the gateway probes in RC-01 and RC-03 exercise the inter-node contract at its one entry point (REQ-114, AC-107), which is a peer's real surface. |
| Each test enters through its scenario's real trigger and follows the real actor's or event's steps, without a setup real use does not produce | Pass | The owner's actions go through GraphQL (the Nodes tab's API) and the composer WebSocket. The agents' actions are real tool calls (`delegate_task`, `send_message_to`, `update_task`) made by the scripted runtime. Restarts are real process stops and starts. Partition and identity mismatch use the proxy, standing in for a network link the user operates. No hidden state is mutated, except RC-04 removing a published workspace folder, which is an owner-operable change. |

## Findings

None.

Non-blocking notes for the API/E2E owner, at their discretion. None affects requirement proof:
- The file header says "About 8 minutes", but the round-3 runs take about 130 s (`API-r3-run4.log`, Duration 129.43 s). TESTING.md asks the header to describe the run, so update it when the file is next touched.
- `ids.team`, `ids.org`, `ids.manager` and `ids.bystander` first hold a definition ID (`beforeAll`) and are later overwritten with run IDs or objects (RC-06, RC-07, RC-08, RC-10). Separate keys would read more clearly.
- RC-05's standalone sequence check is vacuous: that view emits no sequenced frames, as disclosed. RC-06 and RC-07 are not vacuous, because they wait for a local message frame after the remote exchange. An explicit `sequenced > 0` there would keep it so.

## Follow-ups

- Follow-ups this review added: None.
- FU-003 and FU-004, recorded by API/E2E and the architecture reviewer, are pre-existing and outside this ticket. This review agrees, from the base bisect evidence in `API-21-race-repeat-and-base-bisect.log`.

## Latest Authoritative Result

- Result: `Not Applicable` (round 3, CRR-010: no durable test changed); round 2 CRR-008 and round 1 CRR-007 `Pass`
- Changed durable test paths reviewed: `autobyteus-server-ts/tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts` (through `a777af6b1d`)
- Unresolved finding IDs: none (the CRR-007 notes are resolved)
- Recommended Recipient: `/software_engineering_team/delivery_engineer`
- Notes:
  - Classification `Large` / `High`.
  - Source review is final at CRR-006: CR-001, CR-002 and F-002 resolved.
  - The residual items for delivery: AC-113 (the user's desktop + Docker check, both directions, real runtimes); RSK-106 / FU-002; follow-ups FU-002 … FU-004 for the Solution Designer to send when the ticket leaves the team; the readability note C-9 in `root-task-execution-lifecycle.ts` (optional).
  - `code-review-report.md`, `code-review-revision-record.md` and this report are written in the worktree but not committed.
