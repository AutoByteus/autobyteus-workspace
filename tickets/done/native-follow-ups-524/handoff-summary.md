# Handoff Summary

## Summary Meta

- Ticket: `native-follow-ups-524` (Project Task `autobyteus-524`, round 1: FU-003 of autobyteus-515; delegated by `/project_task_manager`)
- Date: `2026-11-17`
- Classification: `task_size: Small`, `architectural_risk: Low`; route: direct low-risk (design SR-001; implementation IR-001; API/E2E `API-REV-001` Pass, final confidence 94.0%; independent architecture review, code review and test-code review `Not Applicable`).
- Current Status: `Verified from evidence; finalized on personal; no release` (the finalization record is in `release-deployment-report.md`)
- Branch: `codex/native-follow-ups-524`, base `origin/personal` @ `ff13782f36` at bootstrap; integrated with `origin/personal` @ `d61bae54a0` (9 commits, web files only; merge `08d33082f3`, no conflict) before delivery edits. Product source is final at `80483cce9d`; later commits are reports, evidence and docs.

## Delivery Summary

- Delivered scope:
  - A native `run_bash` start no longer fails under load for a command that would have started. The start handshake may now take 30 s (it was a fixed 1.5 s), or the call's own `timeout_seconds` when that is shorter. A single `ps` (or WSL kill) read has no cap of its own: it is bounded by the deadline of the step it serves (it was a hidden 500 ms cap).
  - Observation and retirement of a command use 10 s; confirming a stopped command's group is gone uses 30 s (it was 0.5–3 s). The graces (cancel gate and TERM→KILL 500 ms each, stdout end marker 1 s) and the 3 s host-shutdown budget keep their values and are named with their reasons next to the limits.
  - All limits are named in one file, `autobyteus-ts/src/tools/terminal/command-execution/command-deadline.ts`; the executor imports the start limit; the scope and observer take their defaults from it.
  - A start that does not complete reads "Command did not start within N s: <reason>" (N is the limit applied); a launch that fails outright still fails at once with its own reason. A Stop during a start now ends the call as that Stop (`tool-abort`) instead of a failed start (implementation decision I-1; the scope's cancel text names the reason, I-2).
  - Measured: 0 of 1,830 calls failed in bursts of 200, 60 and 10 at load 106–150 on this Mac (before: 60/60 and 200/200 failed at load ~100–145).
- Docs synced (`docs-sync-report.md`): `autobyteus-ts/docs/terminal_tools.md` ("Command time limits" and the module tree). `DESIGN.md`, `TESTING.md` and `RELEASE.md` need no change; a `TESTING.md` proposal is `follow-ups.md` FU-004.
- Durable coverage: the implementation's unit cases in `tests/unit/tools/terminal/command-execution/{shell-command-executor,native-command-process-scope,process-group-observer}.test.ts` (8 of them fail on the old source) and four cleanup hooks that now give a stop its limit. API/E2E added no test code; the burst is load-dependent and cannot be a durable test.

## Verification Summary

- Verified from evidence by delivery; no user check is needed. AC-001…AC-006 (all critical) are directly proven; the critical evidence files were opened (`release-deployment-report.md`, Verification).
- Final confidence 94.0% against the 95% target (not met by 1.0). The gap is environmental (WSL has no host here; QR-001's exact load ~160 could not be held, only approached at 106–150). Delivery judged it sufficient: no criterion is unproven and no category is below 90%.
- Key evidence:
  - `evidence/API-01-burst-latency.log`: every line `"failed":0` (5 × 200, 3 × 60, 3 × 10 calls), each call's stdout checked as `ok-<i>` by the probe, `loadBefore` 106–143.
  - `evidence/API-02-start-cut.log`: every call cut by a short timeout reads "Command did not start within T s: …"; every Stop during a start ends as `tool-abort`, none says "did not start".
  - `evidence/IMP-03-command-execution-unit.log`: 44 passed; the new cases against the old source: 8 failed.
  - `evidence/API-03-server-unit-integration.log`: server unit 4 failed / 8,293 passed, integration 16 failed / 490 passed, every failure in a folder or file-system watcher test with watch events 7.7–9.8 s late or lost (`fseventsd` at 163 % CPU, the cause already in `TESTING.md`).
  - `evidence/API-04-server-command-e2e.log`: background-task transport 9/9, terminal 4/4, the gated busy-run and standalone-host shutdown suites 3/3.
  - `evidence/DEL-01…DEL-03`: delivery's checks on the merged state.
- Integrated-state check: the base brought only web files (phone Settings, autobyteus-522): both typechecks PASS and the 21 terminal unit files (143 tests) PASS. No dependency, lockfile or `autobyteus-ts` change came in, so the burst, server and shutdown evidence stay valid.

## Residual Risks For The User

- R-1 (needs a decision, FU-001): a start cut short by a timeout or a Stop returns only after its cleanup stop is confirmed (limit 30 s, was 3 s): at most 0.7 s with 10 calls starting at once, 2.8 s with 60, about 11 s with 200. Outcomes and texts are right. Decide before a beta carries this change whether a cut start should return before its cleanup is confirmed.
- K-1 (thin margin at the top): 200 commands at once took 15–36 s per whole call at load 106–150, and at load ~200 104 of 200 missed the 30 s start limit. Realistic bursts (10) take at most 1.5 s. Making starts cheaper is out of scope (FU-002).
- K-2: an agent stop on a busy machine can now take up to 30 s to confirm each command's stop (in parallel); a caller's shorter stop timeout reports its usual warning while the confirmation continues.
- K-3: host close keeps its 3 s budget; at heavy load some commands are reported `unconfirmed`, and the drain unit test can fail there (FU-003, FU-007 of autobyteus-515).
- WSL was not measured (ASM-001); the WSL kill follows the same rule (bounded by its step's deadline).
- I-1 and I-2 are behavior details the implementation chose inside the executor and scope beyond the design text. Delivery judged them within the ticket (a longer start makes a Stop during a start common, and API/E2E proved the outcome through the real `runBash`); no reviewer saw the code on this direct route.

## Follow-ups

- FU-001…FU-004 of this ticket are in `follow-ups.md` (the Solution Designer sends them): the cut-start return time (FU-001), the thin margin at the top of the burst (FU-002), the drain test under load (FU-003), the `TESTING.md` row and a durable home for the burst probe (FU-004). FU-004…FU-008 of autobyteus-515 are later rounds of the Task and are not part of this round.

## Release

- No release: the Task says FU-003 "may ship in the next beta" and a release happens only on the founder's word, which has not been given. RELEASE.md's default is no release. A release is available. `release-notes.md` holds user-facing notes for the next release. Decide FU-001 before a beta carries this change.
