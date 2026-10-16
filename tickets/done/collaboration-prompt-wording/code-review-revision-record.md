# Code Review Revision Record

The latest `code-review-report.md` (or `api-e2e-test-review-report.md`) remains authoritative for its current result.

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | API/E2E Failure-Origin Review, round 1 (API-REV-001 Fail) | N/A | Fail, origin classified: Design Impact (F-3), Requirement Gap (F-1) | F-3, F-1 (F-2 follow-up) |
| CRR-002 | `code-review-report.md` | API/E2E Failure-Origin Review, round 2 (API-REV-002 Fail) | Fail (CRR-001) | Fail, origin classified: Local Fix in test code (F-4) | F-4 (F-3, F-1 resolved) |
| CRR-003 | `code-review-report.md` | API/E2E Failure-Origin Review, round 3 (API-REV-003 Fail) | Fail (CRR-002) | Fail, origin classified: Design Impact (F-5) | F-5 (F-4 resolved) |
| CRR-004 | `code-review-report.md` | Implementation Review, Full Review, round 4 (user request) | Fail (CRR-003) | Fail: Design Impact (CR-001, CR-005, F-5) + Local Fix (CR-002, CR-003, CR-004) | CR-001..CR-005, F-5 |
| CRR-005 | `code-review-report.md` | Implementation Review, Full Re-Audit of the IR-005 delta, round 5 | Fail (CRR-004) | Pass (9.3/10) | CR-001..CR-005, F-5 (wording) resolved |
| CRR-006 | `api-e2e-test-review-report.md` | Post-API/E2E test-code review, round 1 (API-REV-004 Pass) | Pass (CRR-005, implementation review) | Fail (Local Fix, test code) | T-1, T-2 |
| CRR-007 | `api-e2e-test-review-report.md` | Post-API/E2E test-code review, round 2 (API-REV-005) | Fail (CRR-006) | Pass | T-1, T-2 resolved |

## Revision Entries

### CRR-001 — Failure origin of the API/E2E Fail for the collaboration prompt wording

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-prompt-wording/tickets/in-progress/collaboration-prompt-wording/code-review-report.md`
- Review entry point and round: API/E2E Failure-Origin Review, round 1
- Review scope: `N/A` (failure-origin round)
- Triggering role, report path, and finding or scenario IDs: api_e2e_engineer, `api-e2e-execution-coverage-report.md` (Fail, 80%); F-3 (AC-008), F-1 (AC-005), F-2
- Relevant solution revision IDs: `SR-001`, `SR-002`
- Relevant architecture-review revision IDs: `N/A`
- Relevant implementation revision IDs: `IR-001`
- Relevant API/E2E revision IDs: `API-REV-001`
- Relevant delivery revision IDs: `N/A`
- Prior authoritative result: N/A (direct route; no earlier code review)
- Current authoritative result: Fail, origin classified
- What changed in the review result and why:
  - F-3 comes from the approved wording, not the implementation. §7.1's unlabelled name, which is also the run-ID prefix, misleads models; the code emits the approved text exactly.
  - F-3b: two misuse refusals with no next step are absent from design T-3.
  - F-1: a pre-existing propagation of `TaskDelegationError` from `assertDeliveryAllowed` makes the new cross-Task and closed-Task texts unreachable. Fixing it is outside the Scope Guardrail, so it is a scope decision.
  - F-2: pre-existing; sent as a follow-up.
- Supported product scenario / material-premise basis changes: None. C-3 (the §5.1 coordinator report-back wording) is held for evidence.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: F-3 (F-3a, F-3b), F-1
- Material score or classification changes: N/A. Medium / Low confirmed.
- Recommended recipient: `/software_engineering_team/solution_designer`
- Follow-ups: FU-CPW-1 sent to `/project_task_manager`, delivered to run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03` (2026-10-16); added as part 3 of the existing Task `project_task_a1dfb6dc-0bc2-4e16-a6e7-4c288d9d4887` (TODO)
- Remaining risks or uncertainty: the root-cause trace was not retained; live samples are small.

### CRR-002 — Failure origin of the LM Studio LE-A1 gap (F-4)

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-prompt-wording/tickets/in-progress/collaboration-prompt-wording/code-review-report.md` (rewritten for round 2; round 1 summarized in it)
- Review entry point and round: API/E2E Failure-Origin Review, round 2
- Review scope: `N/A` (failure-origin round)
- Triggering role, report path, and finding or scenario IDs: api_e2e_engineer, `api-e2e-execution-coverage-report.md` (API-REV-002, Fail 85%); F-4 (AC-008 pass bar on native AutoByteus)
- Relevant solution revision IDs: `SR-003`
- Relevant architecture-review revision IDs: `N/A`
- Relevant implementation revision IDs: `IR-002`
- Relevant API/E2E revision IDs: `API-REV-002`
- Relevant delivery revision IDs: `N/A`
- Prior authoritative result: Fail (CRR-001: Design Impact F-3, Requirement Gap F-1)
- Current authoritative result: Fail, origin classified as a `Local Fix` in test code
- What changed in the review result and why:
  - All 12 branch LM Studio failures, and 3 of 6 base failures, fail at the same assertion (`agent-initiated-collaborators.e2e.test.ts:561:84`, "message by address after delegation"). In each, the payload is an accepted `send_message_to`: the delegator's unrequested by-ID acknowledgement, which `callTool` (`:367`) takes as its own call because it matches any completion after its turn.
  - The kept traces show the AC-008 behavior holds: helper reports by ID 19/20 on the branch vs 18/20 on the base, with no send to an address or a name.
  - Fix and re-measure: match the requested call and wait for the delegator to go idle after the report, then rerun the LM Studio comparison.
- Supported product scenario / material-premise basis changes: C-7 (more acknowledgements on the branch with the local model) is held for evidence as an advisory. C-8 (refused name-plus-ID attempts on Claude) is rejected as a failure and left to the owner.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| F-3a | Design Impact | Resolved | SR-003, IR-002, API-REV-002 | Claude LE-A1 5/5 vs base 5/5; J1 by ID 5/5 vs 2/5; J3 5/5 vs 5/5; LM Studio helper reports by ID 19/20 vs 18/20 |
| F-3b | Design Impact | Resolved | SR-003, IR-002 | CPW-R1 extended asserts the new refusal texts over the real MCP endpoint (8/8 suite) |
| F-1 | Requirement Gap | Resolved | SR-003 (DEC-009), IR-002 | CPW-R2 passes; the cross-Task refusal arrives as `{accepted:false, code, message}` |
| F-2 | Follow-up | Unchanged (follow-up) | FU-CPW-1 | Task `project_task_a1dfb6dc-…` part 3 |

- New or remaining finding IDs: F-4 (test code)
- Material score or classification changes: Medium / Low unchanged
- Recommended recipient: `/software_engineering_team/api_e2e_engineer`
- Remaining risks or uncertainty: C-7 and C-8 for the Solution Designer (non-blocking). My re-scoring (branch 19/19 vs base 17/19 valid runs) is an inference; the bar needs re-measurement.

### CRR-003 — Failure origin of the Codex echo loops (F-5)

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-prompt-wording/tickets/in-progress/collaboration-prompt-wording/code-review-report.md` (rewritten for round 3; earlier rounds summarized)
- Review entry point and round: API/E2E Failure-Origin Review, round 3
- Review scope: `N/A` (failure-origin round)
- Triggering role, report path, and finding or scenario IDs: api_e2e_engineer, `api-e2e-execution-coverage-report.md` (API-REV-003, Fail 88%); F-5 (AC-008 bar on Codex)
- Relevant solution revision IDs: `SR-010`, `SR-013` (answering rule, header without a name)
- Relevant architecture-review revision IDs: `N/A`
- Relevant implementation revision IDs: `IR-003`, `IR-004`
- Relevant API/E2E revision IDs: `API-REV-003`
- Relevant delivery revision IDs: `N/A`
- Prior authoritative result: Fail, test-code Local Fix (CRR-002)
- Current authoritative result: Fail, origin classified as `Design Impact`
- What changed in the review result and why:
  - On the branch, the Codex delegator answers its task agent's result with `send_message_to`. On the base it answers in text and sends nothing.
  - With the test helper's always-reply instruction this becomes an unbounded echo: run 3 exchanged 178 messages.
  - Recount of genuine unprompted delegator sends (scripted test contents excluded): branch 12/15, base 0/15. Loops: 5/15 vs 0/15.
  - The wording (§4.1, from SR-010) invites answering every received message and never says a result needs no reply.
- Supported product scenario / material-premise basis changes:
  - C-11 (test helper always replies): rejected as the origin; it amplifies but is not the differential.
  - C-12 (header without name or address, SR-013): held for evidence. Offered as the user's A/B option.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| F-4 | Local Fix (test code) | Resolved | API-REV-003 | the live test takes the completion of the call it requested and waits for the delegator to go quiet; applied on branch and base |
| C-7 | Held (advisory) | Superseded by F-5 | API-REV-003 | the acknowledgement behavior recurs on Codex and becomes unbounded |
| C-8 | Rejected (owner's call) | Did not recur | API-REV-003 | 0 address replies in 20 journey samples and 5 Claude LE-A1 runs |
| F-2 | Follow-up | Unchanged | FU-CPW-1 | Task `project_task_a1dfb6dc-…` part 3 |

- New or remaining finding IDs: F-5
- Material score or classification changes: Medium / Low unchanged
- Recommended recipient: `/software_engineering_team/solution_designer`
- Remaining risks or uncertainty: the cause is not isolated between the answering rule and the header change (the A/B is proposed). The analysis script miscounts scripted calls on the base.
- Routing note: at the user's direction, a confirmation rerun was requested from `/software_engineering_team/api_e2e_engineer` first; the Solution Designer handoff is held until its results are reviewed (next CRR entry).

### CRR-004 — Full source review (user request) before the F-5 rerun

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-prompt-wording/tickets/in-progress/collaboration-prompt-wording/code-review-report.md` (rewritten as the full implementation review; F-5 carried)
- Review entry point and round: Implementation Review, round 4
- Review scope: `Full Review` (`3712cd9bf0..71db6bbdd8`; first source review of this direct-route ticket)
- Triggering role, report path, and finding or scenario IDs: the user (2026-10-16): "please do a full review of the code, if everything good, then ask api e2e to test again … if result still bad, we send to solution designer". Then: "you decide based on your handoff rules", and fix the minor items.
- Relevant solution revision IDs: `SR-001`..`SR-014` (SR-012 for CR-001)
- Relevant architecture-review revision IDs: `N/A`
- Relevant implementation revision IDs: `IR-001`..`IR-004`
- Relevant API/E2E revision IDs: `API-REV-003`
- Relevant delivery revision IDs: `N/A`
- Prior authoritative result: Fail, Design Impact F-5 (CRR-003)
- Current authoritative result: Fail, 9.0/10 (four categories below 9.0)
- What changed in the review result and why:
  - The implementation is faithful: role, sections, texts, T-4 and mentions are correct.
  - Reviewer checks: typecheck clean; contracts 19/19 with `dist/` unchanged; server 1350 and web 283 tests pass.
  - Findings:
    - CR-001: parse branch for unreleased `@`-note forms, required by SR-012 (Design Impact).
    - CR-002: unused imports in touched files.
    - CR-003: `@`-viewer concern in `message-recipient-resolution.ts` and its port.
    - CR-004: dummy `configuredRootRole` for the Agent root.
    - CR-005: stale T-2 and cut-off T-3 in `design-spec.md`.
  - CR-003..CR-005 were first recorded as minor; promoted to required at the user's direction.
  - Routed by the handoff rules: implementation review Fail with Design Impact → Solution Designer; the API/E2E rerun of the current build is superseded.
- Supported product scenario / material-premise basis changes: SCN-R1 (stored `@` notes in unreleased wordings) classified Technically Possible but Unsupported; it cannot justify the parse branch.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| F-5 | Design Impact (CRR-003) | Open, carried | SR-010, SR-013 | unchanged evidence (branch 12/15 vs base 0/15 unprompted sends; 5/15 loops) |
| F-2 | Follow-up | Unchanged | FU-CPW-1 | Task `project_task_a1dfb6dc-…` part 3 |

- New or remaining finding IDs: CR-001..CR-005, F-5
- Material score or classification changes: first scorecard for this ticket (9.0/10). Medium / Low unchanged.
- Recommended recipient: `/software_engineering_team/solution_designer`
- Remaining risks or uncertainty: F-5 cause not isolated (A/B proposed)

### CRR-005 — IR-005 delta review (SR-015, SR-016)

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-prompt-wording/tickets/in-progress/collaboration-prompt-wording/code-review-report.md`
- Review entry point and round: Implementation Review, round 5
- Review scope: `Full Re-Audit` of `71db6bbdd8..5c94518446`. New shared data (`senderAddress` on two delivery inputs, `reachingAddressOf` on the task adapter) and new files go beyond the prior findings' files.
- Triggering role, report path, and finding or scenario IDs: implementation_engineer, `implementation-handoff.md` IR-005; CR-001..CR-005, F-5
- Relevant solution revision IDs: `SR-015`, `SR-016`
- Relevant architecture-review revision IDs: `N/A`
- Relevant implementation revision IDs: `IR-005`
- Relevant API/E2E revision IDs: `N/A` (next)
- Relevant delivery revision IDs: `N/A`
- Prior authoritative result: Fail (CRR-004)
- Current authoritative result: Pass, 9.3/10, every category ≥ 9.0
- What changed in the review result and why:
  - All CRR-004 findings are resolved.
  - The new T-5 mechanism (`reachingAddressOf`, resolution-based, receiver as viewer; run-wide for the task message) and the shared `receivedMessageHeader` are correct and tested.
  - The no-reply wording equals the wording file.
  - Reviewer checks: tsc clean; `--noUnusedLocals` clean in touched files; contracts 18/18 with `dist/` unchanged; server 1665 and web 476 tests pass.
- Supported product scenario / material-premise basis changes: None. C-20..C-22 rejected with reasons.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Design Impact | Resolved | SR-015, IR-005 | `EARLIER_GUIDANCE`, its use and test removed; `dist/` rebuilt; the web parser reads only the new and released forms |
| CR-002 | Local Fix | Resolved | IR-005 | `--noUnusedLocals` reports nothing in files touched by the ticket |
| CR-003 | Local Fix | Resolved | IR-005 | `mention-viewer.ts` with `MentionViewerIndexPort`; `MessageRecipientIndexPort` messaging-only; the indexes implement both |
| CR-004 | Local Fix | Resolved | IR-005 | `MemberScopeRootFacts.configured: ConfiguredRootPlacements \| null`; the Agent root passes `null` |
| CR-005 | Design Impact | Resolved | SR-015 | design T-2 matches §7.2; T-3 complete |
| F-5 | Design Impact | Wording resolved; runtime proof pending | SR-015, IR-005 | no-reply rule in all four sections, equal to the wording file; Codex live proof at API/E2E |
| F-2 | Follow-up | Unchanged | FU-CPW-1 | Task `project_task_a1dfb6dc-…` part 3 |

- New or remaining finding IDs: None
- Material score or classification changes: 9.0 → 9.3. Medium / Low unchanged.
- Recommended recipient: `/software_engineering_team/api_e2e_engineer` (informational: `/software_engineering_team/implementation_engineer`)
- Remaining risks or uncertainty: F-5 proof on Codex (AC-008 as revised in SR-015)

### CRR-006 — Proportional review of the API/E2E durable tests (API-REV-004)

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-prompt-wording/tickets/in-progress/collaboration-prompt-wording/api-e2e-test-review-report.md` (new)
- Review entry point and round: Successful API/E2E test-code review, round 1
- Review scope: `N/A` (test review)
- Triggering role, report path, and finding or scenario IDs: api_e2e_engineer, `api-e2e-execution-coverage-report.md` (API-REV-004, Pass 93% on Claude Sonnet and DeepSeek flash; Codex not run at the user's direction)
- Relevant solution revision IDs: `SR-015`, `SR-016`
- Relevant architecture-review revision IDs: `N/A`
- Relevant implementation revision IDs: `IR-005`
- Relevant API/E2E revision IDs: `API-REV-004`
- Relevant delivery revision IDs: `N/A`
- Prior authoritative result: Pass (CRR-005, implementation review)
- Current authoritative result: Fail (Local Fix, test code)
- What changed in the review result and why:
  - The suite and harness are coherent and assert the approved texts through real roots.
  - T-1: the expected views are read from `tickets/in-progress/…`, which delivery archives to `tickets/done/`, so the gated suite would break after delivery.
  - T-2: the stale "Known gap" comment on CPW-R2 contradicts the fixed behavior.
  - Evidence check (reviewer-opened):
    - LE-A1 analysis: 0 unprompted sends in every run.
    - Exit codes: branch DeepSeek 15/17 (runs 4 and 6 failed), base 15/16 (run 2 failed), Sonnet 10/10 each.
    - The three failed runs' traces show the provider rollback.
    - D-final 11/11.
    - Journeys: 20/20 reported on each side, with no wrong or both-selector replies.
    - J2: no reply to the result.
- Supported product scenario / material-premise basis changes: None

#### Prior Finding Resolution

None (first test review of this ticket).

- New or remaining finding IDs: T-1, T-2
- Material score or classification changes: N/A
- Recommended recipient: `/software_engineering_team/api_e2e_engineer`
- Remaining risks or uncertainty: AC-008 Codex clause not run on IR-005 (usage limit; user decision); carried to the Solution Designer via the package

### CRR-007 — Test-code review round 2 (T-1, T-2 fixed)

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-prompt-wording/tickets/in-progress/collaboration-prompt-wording/api-e2e-test-review-report.md`
- Review entry point and round: Successful API/E2E test-code review, round 2
- Review scope: `N/A` (test review)
- Triggering role, report path, and finding or scenario IDs: api_e2e_engineer, API-REV-005; T-1, T-2
- Relevant solution revision IDs: `SR-015`, `SR-016`
- Relevant architecture-review revision IDs: `N/A`
- Relevant implementation revision IDs: `IR-005`
- Relevant API/E2E revision IDs: `API-REV-004`, `API-REV-005`
- Relevant delivery revision IDs: `N/A`
- Prior authoritative result: Fail (CRR-006)
- Current authoritative result: Pass
- What changed in the review result and why: the fixture replaces the ticket path (its six blocks are byte-identical to the approved views, reviewer-checked), and the CPW-R2 comment is accurate. Reviewer rerun: 11/11.
- Supported product scenario / material-premise basis changes: None

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| T-1 | Local Fix (test) | Resolved | API-REV-005 | default `viewsPath` = `tests/e2e/fixtures/collaboration-prompt-complete-views.md`; blocks identical to the views; no `tickets/` path in the suite or harness |
| T-2 | Local Fix (test) | Resolved | API-REV-005 | CPW-R2 comment states the T-4 behavior |

- New or remaining finding IDs: None
- Material score or classification changes: N/A
- Recommended recipient: `/software_engineering_team/delivery_engineer`
- Remaining risks or uncertainty: AC-008 Codex clause not run on IR-005 (user decision); native-runtime prompt read-back and role on restore not live-proven; 26 catalogue texts unit-only; duplicate "You" bubble observation
