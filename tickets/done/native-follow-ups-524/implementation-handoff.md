# Implementation Handoff — autobyteus-524 round 1: FU-003 (native command start and stop limits)

Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/native-follow-ups-524`, branch `codex/native-follow-ups-524`, base `origin/personal` `ff13782f36`.
Implementation commit `80483cce9d`; ticket documents and evidence in the commit that carries this file.
Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/native-follow-ups-524/tickets/in-progress/native-follow-ups-524/`.

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: Small / Low → direct implementation, then direct API/E2E (no Code Reviewer)
- Requirements doc: `requirements-doc.md` (SR-001, Approved)
- Investigation notes: `investigation-notes.md`
- Solution revision record: `solution-revision-record.md`
- Design spec (required on every route): `design-spec.md` (SR-001, Ready)
- Supplemental task artifacts: `evidence/run-bash-burst-probe.mjs`, `evidence/measure-command-start-handshake.mjs`
- Design review report: `N/A — not applicable`
- Architecture review revision record: `N/A — not applicable`
- Triggering rework report, revision record, or evidence, when applicable: N/A

## Current Implementation Summary

The native command scope's limits are named in `command-deadline.ts`: start 30 s, observation and retirement 10 s, stop confirmation 30 s. The graces (500 ms, 500 ms, 1 s) and the 3 s shutdown budget are named with their unchanged values. A single `ps` read or WSL kill has no cap of its own and is bounded by its step's deadline. The executor gives the start `min(start limit, call timeout)` and reports "Command did not start within N s: <reason>".

- Implementation cycle: `Initial`
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: SR-001
- Related architecture-review revision IDs: N/A
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Triggering finding IDs: N/A

## Routing Classification (Mandatory)

- Task size: `Small`
- Architecture risk: `Low`
- Design classification section / evidence reference: `design-spec.md` "Task Size And Architectural Risk"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale for confirmation or change: four source files in `command-execution/`, no contract, API or persistence change. The two additions (I-1, I-2 below) stay inside the executor and the scope. The longer stop confirmation is felt by the agent-stop and host-close paths (K-2, K-3), which keep their own timeouts and budgets; no new owner or contract
- Selected route: `Direct API/E2E`
- Lightweight implementation self-review completed for the direct route: `Yes` (below)
- New design impact or escalation trigger: `None`. The trigger "a test or product path relies on a start failing within 1.5 s" was checked: no test pins the start limit. Four test cleanup hooks relied on a stop ending within 3 s (their 10 s / 2 s timeouts); they now take the stop limit (tests follow the code)

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Start handshake up to 30 s, or the call's timeout when shorter; an erroring launch still fails at once | `shell-command-executor.ts`: `startLimitMs = Math.min(COMMAND_START_LIMIT_MS, timeoutMs ?? COMMAND_START_LIMIT_MS)` → `scope.start(invocation, now + startLimitMs)`; scope default `COMMAND_START_LIMIT_MS` | Unit AC-002 (1 s cap, 10/60/null → 10/30/30 s), AC-003 (immediate ENOENT failure < 5 s) (IMP-03). Burst probe AC-001 (IMP-01, IMP-02) |
| BEH-002 | No per-run cap; a `ps`/WSL run is bounded by the step's deadline | `process-group-observer.ts` `read`: `timeout = deadline - now`; WSL kill `timeout: max(1, deadline - now)` | Unit AC-004: a 700 ms read within 5 s succeeds and gets the remaining deadline; a read past its deadline still fails (IMP-03) |
| BEH-003 | Observation and retirement 10 s; stop confirmation 30 s; graces and the 3 s shutdown budget kept, named | `command-deadline.ts` names; scope `members`, `retireCompleted`, `stop`, `drain`, `close`; observer `snapshot` default | Unit AC-005: start 30 s, members 10 s, stop 30 s, close's stops 3 s (IMP-03) |
| BEH-004 | "Command did not start within N s: <reason>"; exit code null, no output | executor catch | Unit AC-002/AC-003 (IMP-03). I-1: a Stop during the start ends as `tool-abort` (unit) |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

- `autobyteus-ts/src/tools/terminal/command-execution/{command-deadline,native-command-process-scope,process-group-observer,shell-command-executor}.ts`
- Tests: `tests/unit/tools/terminal/command-execution/{process-group-observer,shell-command-executor,native-command-process-scope}.test.ts` (new cases); cleanup-hook timeouts in `tests/integration/tools/terminal/{terminal-tools,run-bash-wrapper}.test.ts`, `tests/unit/tools/terminal/background-process-manager.test.ts`, `tests/integration/agent/tool-approval-flow.test.ts`

## Important Assumptions

- ASM-001 (WSL unmeasured) carried: the WSL kill follows the same rule (bounded by the step deadline).
- The 1 s maintenance tick is a cadence, not a limit; kept as a literal (RF-006: "Kept").

## Known Risks

- K-1 (thin margin): on the final build, 200 calls at once passed at load 93–103, but the slowest took 29.2 s against the 30 s start limit. At load 201–203, 104 of 200 missed the limit, beyond QR-001's measured envelope (load ~160) and the non-goal. RF-004 measured a worst of 18.4 s. API/E2E should measure the 200 burst at load ~160 before relying on QR-001 (IMP-02).
- K-2: run end now confirms each command stop for up to 30 s (was 3 s). On a busy machine an agent's stop (`BackgroundProcessCleanupStep` → `stopAllForRunEnd`) can therefore outlast a short `agent.stop(timeout)`. The caller gets the existing "Timeout waiting for worker loop to terminate" warning while the confirmation continues. Seen in `tool-approval-flow` at load ~240 with `agent.stop(2)`; that test now gives 35 s.
- K-3: host close keeps its 3 s budget (out of scope, FU-007). Under heavy load it reports some stops `unconfirmed`: `native-command-process-scope.test.ts` "drains multiple groups…" failed once in the final full run at load ~180 (the fixture checks every close outcome is confirmed). The old code fails the same check as soon as one `ps` read exceeds 0.5 s.
- I-1 (implementation decision beyond the design text): a Stop arriving during the start was reported as "Command did not start within 30 s: Command launch cancelled by shutdown" (before: "Command did not start: …"). With starts now taking seconds under load, that path is common (`run-bash-wrapper` "timeout and Stop…" hit it). The executor now ends such a call as the Stop (`stderr: tool-abort`, `timedOut: true`), as for a running command. A call timeout that cuts the start keeps "did not start within N s" (AC-002).
- I-2 (same): the scope's cancelled-launch error named "shutdown" for any cancel; it now names the stop reason (`Command launch cancelled (tool-timeout)`, or `… by shutdown` when the scope is closing).

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Bug Fix
- Reviewed root-cause classification: Local Implementation Defect, with a hidden duplicate limit
- Reviewed refactor decision: No Refactor Needed (naming the limits is part of the fix)
- Implementation matched the reviewed assessment: Yes
- If challenged, routed as `Design Impact`: N/A
- Evidence / notes: the start limit now lives in one place; the executor imports it.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed (Core Principle 7): `Yes` (the literal limits replaced; nothing else dead in the four files)
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight: `Yes` (constants only)
- Canonical shared design guidance was reapplied during implementation: `Yes`
- Deviations from a design principle decided during implementation: `None` (I-1 and I-2 are behavior details inside the executor's and scope's own messages)
- Changed source implementation files stayed within proactive size-pressure guardrails: `Yes` (largest: the scope, 155 lines)
- Notes: lightweight self-review: every literal deadline named (`grep` of 500/1500/3000/1000 in the four files leaves only the 1 s maintenance cadence and the seconds conversion); `COMMAND_*` names say what each bounds; the new tests fail on the old source (8 of the new or extended cases, IMP-03); no other caller passes its own short deadline to the scope (searched `Date.now() + <n>` in terminal and server code).

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected`
- Design-spec decision reference: "Persisted Data / State Transition Decision"
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`
- Direct-use evidence or discard/rebuild result, when applicable: N/A
- Migration implementation and focused checks, only when `Migration Required`: N/A
- Deviation from the reviewed transition decision: `None`

## Environment Or Dependency Notes

- This Mac's load average from other processes ranged 90–240 during the checks; each evidence file states it.
- The worktree needed `pnpm -C autobyteus-server-ts prebuild` and the server typecheck (builds the shared packages) before the server tests could load.

## Checks Run

Evidence in `evidence/` of the ticket folder.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | burst probe N=60 and N=200 on the unchanged build | `ff13782f36` | load 100–102 | run_bash start | AC-001 (before) | Fails as expected | `IMP-01-burst-probe-before.log` | `"failed": 60`, `"failed": 200` |
| IMP-02 | burst probe on the change | `80483cce9d` (+ first version) | load per section | run_bash start | AC-001, QR-001 | Pass at load 93–103 (0/200, 0/60); 104/200 fail at load ~200 (K-1) | `IMP-02-burst-probe-after.log` | `"failed": 0`, `"okMsMax": 29244` |
| IMP-03 | `vitest run tests/unit/tools/terminal/command-execution`; the new tests against the old source | `80483cce9d` | — | scope, observer, executor | AC-002…AC-005, I-1 | Pass 44/44; old source fails 8 | `IMP-03-command-execution-unit.log` | `Tests  44 passed (44)`; `8 failed` |
| IMP-04 | `pnpm -C autobyteus-ts test` (full): final, old-source comparison, two earlier versions | `80483cce9d` | load 113–242 | whole library | AC-006 | Final: 1 failed / 2496 passed (K-3); run_bash and tool-approval cases of 515's FU-003 pass | `IMP-04-autobyteus-ts-full-suite.log` | `Tests  1 failed | 2496 passed`; the failure is the close-confirmation fixture |
| IMP-05 | `tool-approval-flow` + `tests/integration/tools/terminal` | `80483cce9d` | load ~200 | changed cleanup hooks | AC-006 | Pass 54/54 | `IMP-05-terminal-integration.log` | `Tests  54 passed (54)` |
| IMP-06 | server unit (native backend, command shutdown) and 3 integration files that run commands | `80483cce9d` | — | server through the library | AC-006 | Pass 119 + 12 | `IMP-06-server-command-tests.log` | `Tests  119 passed`, `Tests  12 passed` |
| IMP-07 | server and web typechecks | `80483cce9d` | — | all TypeScript | — | Pass at baseline | `IMP-07-typechecks.log` | `production errors: 0` both |

- Not run, and why: the whole server unit, integration and E2E suites (left to API/E2E; the change is inside the library's command scope); WSL (no WSL host, ASM-001).

## Frontend Rendered-Result Check (When Applicable)

Not Applicable: no frontend change.

## Downstream Coverage Hints / Suggested Scenarios

- AC-001 at QR-001's load: `node evidence/run-bash-burst-probe.mjs <worktree> 200` after `pnpm -C autobyteus-ts build`, with the load around 160, and the slowest call's time (K-1).
- A Stop pressed during a slow start: the call ends as stopped (`tool-abort`), no "did not start" text (I-1).
- A call with `timeout_seconds` shorter than 30 whose start misses: "Command did not start within N s".
- An agent stopped right after `run_bash` calls on a busy machine (K-2); host close under load (K-3).

## API / E2E / Executable Coverage Investigation And Execution Still Required

- AC-001 at load ~160 (K-1); AC-006 server suites that run commands beyond the files in IMP-06.
