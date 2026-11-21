# Code Review Report

## Review Round Meta

- Review Entry Point: `API/E2E Failure-Origin Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (Approved for FU-002, FU-003, FU-005…FU-009; REQ-007, REQ-008; AC-007, AC-008)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (through the design)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md`
- Design Spec Reviewed As Context: `design-spec.md` (FU-008 mechanism, item 8, lines 63-64; "Behavior by absence", line 84)
- Supplemental Task Artifacts Reviewed As Context: `follow-ups.md`
- Relevant Solution Revision IDs: as the requirements header
- Design Review Report Reviewed As Context: `N/A — not applicable` (direct route: Medium / Low)
- Architecture Review Revision Record Reviewed As Context: `N/A — not applicable`
- Implementation Handoff Reviewed As Context: `implementation-handoff.md` (IR-001)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: 1 (no prior code review: direct route)
- Review Scope: `N/A` (failure-origin round)
- Trigger: API-REV-001 `Fail`
- Coverage Investigation Reviewed: `api-e2e-coverage-investigation.md`
- Execution Coverage Report Reviewed: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed: `api-e2e-revision-record.md` (API-REV-001)
- Failing Scenario IDs: AC-008 / REQ-008 (FU-008): `tests/e2e/runtime/grok-build-runtime-replay.e2e.test.ts` › "lists the Grok Build catalog from the agent handshake with the reasoning-effort schema (AC-002)", failing in API-05 and in 1 of 2 runs of API-05b. Also for the owner: AC-007 (DCF-E2E-007), an environment failure.
- Exact Failing Command / Execution Mode: after `pnpm -C autobyteus-server-ts build`, on a loaded host: `env -i PATH="$PATH" HOME="$(mktemp -d)" TMPDIR="$TMPDIR" USER="$USER" pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/grok-build-runtime-replay.e2e.test.ts --no-watch -t "lists the Grok Build catalog"`
- Failure Evidence Paths: `evidence/API-05-ac008-probes-under-load.log`, `evidence/API-05b-grok-catalog-bound-diagnostic.log` (`PTBDIAG {"boundMs":3000,"firedAfterMs":7720,"exitCode":null}`, then `PTBDIAG-LATER {"exitSeenAt":7730,"exitCode":0}`), `evidence/API-04-ac007-live-refresh-x3.log`
- Code tested: `56c61c3ecb` (code `8850dc3f99` + `570aab87d2`); reports `e99963e815`
- Testing guideline read: `TESTING.md` § Rules, "File watching on a busy Mac" (a blocked main thread on a busy host)

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `Low`
- Selected route: `API/E2E Failure-Origin Review`
- Independent source review required by the classification: `Failure-origin exception` (direct route)
- Classification evidence or correction required: none. The fix stays within the probe owner.

## Review Scope

- Failure context and the smallest relevant path:
  - `src/runtime-management/probe-time-bound.ts` (the single owner of the probe bound);
  - its two callers `antigravity-cli-capability.ts` and `grok/grok-build-capability.ts`;
  - the design's FU-008 mechanism, REQ-008 and AC-008;
  - the diagnostic evidence.
- Explicit exclusions: no general source audit or scorecard (a failure-origin round on a direct route). FU-002, FU-003, FU-005, FU-006 and FU-009 are proven passing by API/E2E and were not re-reviewed.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis: REQ-008. "When their time bound fires after the child has already exited, wait for its `close` and use its real result; when a probe really times out, report a time-out …; log the command and the bound."
- Behavior-basis status for the failing scenario: `Confirmed`. The failing case is exactly REQ-008's first bullet: the Grok `--version` child exited with code 0 before the bound's timer ran. It is the 554 catalog failure FU-008 was opened for.
- The test is valid. It drives the real capability probe through the Grok runtime replay on a real server; only the external CLI is a fake. It fails because the probe reports a time-out for a child that exited.

| Behavior | Status | Evidence |
| --- | --- | --- |
| REQ-008, exited before the bound fires | Contradicted at runtime | `probe-time-bound.ts`: the timer decides by `child.exitCode !== null \|\| child.signalCode !== null` at the moment it runs. API-05b: the 3,000 ms timer ran at 7,720 ms with `exitCode: null`; the exit (code 0) was processed at 7,730 ms. |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario | Related | Kind | Actor | Goal / Event | Entry | Shape | Path | Outcome | Evidence | Validity | Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-PROBE-LATE | REQ-008 | Contract | A runtime capability probe (Grok, Antigravity) during model discovery | The child exits within its bound, but the main thread is blocked past the bound (a busy host, TESTING.md "File watching on a busy Mac") | Model discovery and catalog listing | Explicit Edge (REQ-008 names it) | timer fires late, then the child's exit is processed | The real result, not a time-out | API-05, API-05b | Supported Explicit Edge Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate | Observation | Scenario / Contract | Evidence | Disposition | Scope | Response |
| --- | --- | --- | --- | --- | --- | --- |
| CF-01 | The bound's timer reads `child.exitCode` / `signalCode`, which Node sets only when it processes the child's exit. After a main-thread block longer than the bound, the event loop runs expired timers before the poll phase that delivers the exit, so an already-exited child is seen as running, killed, and reported as timed out. | SCN-PROBE-LATE; REQ-008 | `probe-time-bound.ts`; API-05b order (`firedAfterMs 7720`, `exitCode null`; exit seen at 7,730 ms); design-spec items 8 and 84 prescribe this exact check | Promote | This ticket (`Design Impact`) | See CR-001 |
| CF-02 | The unit tests (IMP-02) never build this order: they set `exitCode` before the timer, or hold stdout open | AC-008 | AC-008's own wording ("a fake child exits before the bound but its `close` is processed after the timer") models a pending `close`, not a pending exit | Promote (part of CR-001) | This ticket | The AC and its unit case need the unprocessed-exit order |
| CF-03 | AC-007: DCF-E2E-007 ends with "ENVIRONMENT: the OS delivered no file event … within 30000 ms" in all three runs; an independent raw `fs.watch` got no event within 30 s; `fseventsd` was at 160–167% CPU | AC-007, REQ-007 | API-04, IMP-08; it passes on Linux (IMP-08) | Not a code or test defect: the test now fails for the right, named reason | Requirement question (for the Solution Designer) | AC-007 asks for three passes "on this host", which the host cannot give while FSEvents delivers nothing. Whether the Linux proof plus the recorded cause satisfies AC-007 is a requirement decision. |
| CF-04 | Electron `PortOwnerInspectorFaults` ENOENT under full-suite load | — | Passes 11/11 alone twice; no Electron file changed | Reject (not this change; load) | — | — |
| CF-05 | SM-04 failed once in a first run and its error was not kept (10/10 on rerun); AGY discovery uses the same bound | REQ-008 | API/E2E's note | Hold for evidence | — | Likely the same CF-01 path for AGY; recheck in API/E2E's next round after the fix |

## Findings

### CR-001 — A probe bound that fires late still reports an exited child as timed out (REQ-008)

- **Basis:** REQ-008, first bullet (a governing contract; Supported Explicit Edge SCN-PROBE-LATE). AC-008. Candidates CF-01 and CF-02.
- **Evidence:**
  - `src/runtime-management/probe-time-bound.ts`: when the timer runs, it decides by `child.exitCode !== null || child.signalCode !== null`. Node sets those fields only when it processes the child's exit.
  - When the main thread is blocked past the bound (on a busy host, by in-process folder watchers), Node's event loop runs the expired timer in its timers phase, before the poll phase that delivers the exit. API-05b shows it: the timer fired at 7,720 ms (bound 3,000) with `exitCode: null`, and the exit (code 0) was processed 10 ms later.
  - So the exited child is killed and `RUNTIME_PROBE_TIMED_OUT` is logged, and Grok model discovery reports "timed out".
- **Origin:** the **design's mechanism**. design-spec FU-008 item 8 prescribes exactly this check, and calls it "an explicit check of the child's state" (line 84). The implementation follows it faithfully, with the check in the single owner `probe-time-bound.ts`.
  - The check cannot observe an exit the event loop has not processed yet. That is precisely REQ-008's case: the bound fires after the child has already exited.
  - AC-008's unit wording ("exits before the bound but its `close` is processed after the timer") encodes the same assumption: it models a late `close`, not a late exit. So IMP-02 passed while the real order fails.
- **Earlier review gap:** none attributable. This is a direct route, with no source review selected, and the gap is in the design's prescribed mechanism.
- **Classification:** **`Design Impact`**, owned by the Solution Designer. The design must choose how a late-firing bound decides. For example:
  - (a) on firing, yield past the pending I/O (`setImmediate` runs after the poll phase of the same loop turn) before reading the child's state; or
  - (b) account for the timer's own lateness, re-arming instead of deciding when it fired far past its bound; or
  - (c) decide by the `exit` / `close` events rather than by reading fields.
  - AC-008's unit case must then build the real order: the child's exit is delivered after the timer callback starts.
- **Ticket scope:** this ticket (FU-008 is in scope and AC-008 fails). The fix stays inside `probe-time-bound.ts` and its unit tests; no interface changes.

## Follow-ups

- Follow-ups this review added: None

## Classification

- `Design Impact` (CR-001). Also for the same owner, a requirement question on AC-007's "on this host" (CF-03).

## Recommended Recipient

- `/solution_designer`: revise the FU-008 mechanism and AC-008's unit case, and decide AC-007's acceptance. Then implementation, API/E2E (API-05 under load again, SM-04, server integration and whole E2E), and the proportional test review.

## Residual Risks

- AC-007 cannot pass on this host until FSEvents delivers events again. The cause is recorded and the Linux proof passes.
- SM-04 (AGY discovery) is held for evidence after the fix (CF-05).

## Latest Authoritative Result

- Review Decision: `Fail`
- Review Entry Point: `API/E2E Failure-Origin Review`
- Supported Product Scenario Gate: `Pass` (SCN-PROBE-LATE is REQ-008's own case)
- Material-Premise Gate: `Pass`
- Score Summary: N/A (failure-origin round)
- Failure Origin: the design's prescribed mechanism. Reading `exitCode` at timer time cannot see an exit Node has not yet processed after a main-thread block, and AC-008's unit case models a late `close` instead of a late exit. The implementation follows the design.
- Recommended Recipient: Solution Designer (`Design Impact`)
- Notes: AC-007 is an environment limit, a requirement question for the same owner.
