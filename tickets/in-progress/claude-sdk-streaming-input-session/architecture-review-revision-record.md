# Architecture Review Revision Record

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / Architecture Design Complete (Large / High) | SR-006, SR-007 | N/A | Fail | ARCH-F-001, ARCH-F-002, ARCH-F-003, ARCH-F-004, ARCH-F-005, ARCH-F-006 |
| ARCH-REV-002 | Round 2 / Revised design SR-008 | SR-008 | Fail | Fail | ARCH-F-001..006 (resolved); ARCH-F-007, ARCH-F-008 (new) |
| ARCH-REV-003 | Round 3 / Revised design SR-009 | SR-009 | Fail | Pass | ARCH-F-007, ARCH-F-008 (resolved); IC-1, IC-2 (constraints) |
| ARCH-REV-004 | Round 4 / SR-011 shared append claim (IMP-DI-001) | SR-010, SR-011 | Pass | Pass | none; IC-3, IC-4 (constraints) |

## Revision Entries

### ARCH-REV-001 — Initial review of the streaming-input session design

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-streaming-input-session/tickets/in-progress/claude-sdk-streaming-input-session/design-review-report.md`
- Review round and trigger: round 1; `Architecture Design Complete` handoff from `/solution_designer` (`solution-handoff.md`)
- Triggering role, report path, and finding IDs: `/solution_designer`, `solution-handoff.md`; no prior findings
- Relevant solution revision IDs: SR-006 (approved requirements), SR-007 (design)
- Prior authoritative decision: N/A
- Current authoritative decision: `Fail` (Design Impact)
- What changed in the review result or what baseline was established: established the baseline.
  - The behavior basis is confirmed and the overall architecture is sound.
  - The blocking issues are the interrupt cancellation race and settlement inconsistency (SDK-documented drain-loop race and prewait latch), the tracker opener/idle-frame classification, turn-id uniqueness across restore, the scope of notice memory recording, and open/send failure semantics.
  - One Unclear item remains: notice text for a completion arriving after the last tool boundary.
  - The persisted-data decision `Directly Usable` was confirmed against the readers.

#### Prior Finding Resolution

None

- New or remaining finding IDs: ARCH-F-001 (High), ARCH-F-002 (Medium), ARCH-F-003 (Low), ARCH-F-004 (Medium), ARCH-F-005 (Low, Unclear), ARCH-F-006 (Low)
- Material classification changes: N/A
- Recommended recipient: `/solution_designer`
- Remaining risks or uncertainty: append-mismatch race (Codex parity, accepted); RSK-007 usage after crash/zeroed error results (verify in implementation); undeclared SDK method signatures isolated in the client; process memory accepted.

### ARCH-REV-002 — Round 2: SR-008 resolves round 1; two narrow rule gaps remain

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-streaming-input-session/tickets/in-progress/claude-sdk-streaming-input-session/design-review-report.md`
- Review round and trigger: round 2; revised `Architecture Design Complete` from `/solution_designer` (SR-008)
- Triggering role, report path, and finding IDs: `/solution_designer`, `solution-handoff.md`; ARCH-F-001..006
- Relevant solution revision IDs: SR-008
- Prior authoritative decision: `Fail` (ARCH-REV-001)
- Current authoritative decision: `Fail` (Design Impact)
- What changed in the review result:
  - All round-1 findings were verified against the SR-008 design spec and the new unfiltered probes P (cq/cam on both CLIs), P-prewait and Q.
  - Two new findings emerged while tracing the new Stop/carry-over and synchronous-register paths: ARCH-F-007 and ARCH-F-008.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| ARCH-F-001 | Open (High) | Resolved | SR-008; design-spec SPINE-5, settlement rule 3, interface | Probe P `cq` on both CLIs: `cancelled:[B]`, B never ran. Capabilities advertise `interrupt_cancel_queued_v1`. There is a single uuid-accounted rule and no `cliTurnOpen`-only settle. Step 1 has a live gated check |
| ARCH-F-002 | Open (Medium) | Resolved | Frame classification table | Unfiltered P/Q captures: every CLI turn opens with `system/init`; unknown kinds are ignored; anomalies are dropped and logged |
| ARCH-F-003 | Open (Low) | Resolved | Tracker: `${runId}:turn:${randomUUID()}` | — |
| ARCH-F-004 | Open (Medium) | Resolved | Persisted-data section; file mapping | Recording is scoped to `sender_id === "system.claude_background_task"`, with a test. Non-blocking dependency-placement note |
| ARCH-F-005 | Open (Unclear) | Resolved | SPINE-3 consumption rule; probe Q | Probe Q: a completion after the last tool boundary gets a CLI-started turn immediately after `result`. The new consumption rule has a Stop-case defect, tracked separately as ARCH-F-007 |
| ARCH-F-006 | Open (Low) | Resolved | SPINE-1; tracker rule 2 `failTurn` | `registerInput` is synchronous and first; failures after it give a turn-terminal `ERROR` with a forwarded result |

- New or remaining finding IDs: ARCH-F-007 (Medium; abort `user` frames mark queued completions consumed, so the REQ-002 carry-over never fires); ARCH-F-008 (Low; interrupt while input is registered but not yet sent)
- Material classification changes: none
- Recommended recipient: `/solution_designer`
- Remaining risks or uncertainty: append-mismatch race (Codex parity); RSK-006 isolated; RSK-007 verify in implementation; process memory accepted.

### ARCH-REV-003 — Round 3: SR-009 resolves ARCH-F-007/008; Pass with implementation constraint IC-1

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-streaming-input-session/tickets/in-progress/claude-sdk-streaming-input-session/design-review-report.md`
- Review round and trigger: round 3; revised `Architecture Design Complete` from `/solution_designer` (SR-009)
- Triggering role, report path, and finding IDs: `/solution_designer`, `solution-handoff.md`; ARCH-F-007, ARCH-F-008
- Relevant solution revision IDs: SR-009
- Prior authoritative decision: `Fail` (ARCH-REV-002)
- Current authoritative decision: `Pass`
- What changed in the review result:
  - Verified the SR-009 SPINE-3 consumption rule against probes J, Q, F, O and P `cq`.
  - Verified the SPINE-5 send-state rules, the neutral sender-id module, the new examples and the step-2 tests.
  - Recorded P-010 (the branch precondition for a provider-turn Stop) as binding implementation constraint IC-1. The design intent is explicit in the branch's own `cliTurnOpen is false` assumption, so it does not warrant another round.
  - Recorded IC-2 as non-blocking hygiene.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| ARCH-F-007 | Open (Medium) | Resolved | SR-009; design-spec SPINE-3 "Consumption"; examples; step 2 | Consumption requires tool_result then assistant before `interruptRequested`: probe J consumes, probe Q does not, and the abort frames in probes F/O/P `cq` are excluded, so the Stop notice and carry-over fire |
| ARCH-F-008 | Open (Low) | Resolved | SR-009; design-spec SPINE-5 send state; examples | Unsent uuids are cancelled locally in any process state; `submitInput` rechecks before `send()`; the SDK interrupt covers only the sent uuids |
| ARCH-F-001..006 | Resolved (ARCH-REV-002) | Resolved | SR-008 | Unchanged by SR-009 |

- New or remaining finding IDs: none. Implementation constraints IC-1 (binding) and IC-2 (hygiene)
- Material classification changes: none
- Recommended recipient: `/implementation_engineer` (primary); `/solution_designer` (informational)
- Remaining risks or uncertainty: append-mismatch race (Codex parity); RSK-006 isolated and live-tested; RSK-007 verify; P-prewait accepted; process memory accepted.

### ARCH-REV-004 — Round 4: SR-011 shared AgentRun append claim (IMP-DI-001) — Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-streaming-input-session/tickets/in-progress/claude-sdk-streaming-input-session/design-review-report.md`
- Review round and trigger: round 4; revised `Architecture Design Complete` (SR-011) after implementation Design Impact IMP-DI-001 (checkpoint `26450e6b0`)
- Triggering role, report path, and finding IDs: `/solution_designer`, `solution-handoff.md`; `implementation-handoff.md` IMP-DI-001
- Relevant solution revision IDs: SR-010, SR-011 (requirements re-approved with DEC-007 = A: REQ-012, BEH-009, AC-014..016, SCN-008)
- Prior authoritative decision: `Pass` (ARCH-REV-003)
- Current authoritative decision: `Pass`
- What changed in the review result:
  - Reviewed the new section "Shared AgentRun Append Claim (SR-011)" against `agent-run-input-admission-state.ts`, `agent-run.ts` (claim, dispatch result, termination) and `codex-thread.ts` `appendInput`.
  - Confirmed the defect, the claim walk, `undeliveredRetryAsStart` with `notInto`, and the preserved invariants.
  - Added constraints IC-3 (split the Codex pre-RPC mismatch from the post-RPC returned-id mismatch, which share `CODEX_TURN_STEER_ID_MISMATCH`) and IC-4 (the claim-time `turnId` return value).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| ARCH-F-001..008 | Resolved | Resolved | SR-008, SR-009 | Sections unchanged in SR-011 |
| Residual risk "append-mismatch race (Codex parity)" | Accepted residual | Resolved by design | SR-011 `undeliveredRetryAsStart` | Definitely-undelivered appends are requeued with `notInto`; ambiguous rejections still fail visibly |

- New or remaining finding IDs: none. Constraints IC-1 and IC-2 (from round 3); IC-3 and IC-4 (new)
- Material classification changes: none; still Large / High
- Recommended recipient: `/implementation_engineer` (primary); `/solution_designer` (informational)
- Remaining risks or uncertainty:
  - The Codex steer path becomes reachable in production for the first time; it is covered by the gated live AC-014 check.
  - RSK-006: the undeclared `cancelQueued` option (unchanged).
  - RSK-007: token usage after a crash reopen (unchanged).
