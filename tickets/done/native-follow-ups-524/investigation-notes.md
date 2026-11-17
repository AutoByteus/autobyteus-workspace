# Investigation Notes — autobyteus-524 (follow-ups of autobyteus-515)

## Investigation Meta

- Package identifier: `native-follow-ups-524`
- Request / ticket: Project Task `autobyteus-524` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`), with its dispatch comment of 2026-11-17 (the founder's direction for FU-003)
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/native-follow-ups-524`
- Repository mode: `Git`
- Task worktree / branch: the root above, `codex/native-follow-ups-524`
- Resolved base remote / branch / revision: `origin/personal` at `ff13782f36` (fetched 2026-11-17)
- Finalization target remote / branch: `origin/personal`
- Bootstrap result: worktree created from the fetched base; `pnpm install --frozen-lockfile`, `pnpm -C autobyteus-ts build` for the probes (no source change)
- Bootstrap blocker: none
- Current solution revision ID: `SR-001`
- Authorities read (requirements gate; file and date): `references/requirements-engineering.md`, `references/ticket-scope.md`, `references/finding-the-cause.md`; architecture gate: `references/architecture-design.md`, `references/design-principles.md`, root `DESIGN.md`, `TESTING.md` (all read in this conversation on 2026-11-17)
- Investigation status: FU-003 complete (round 1). FU-004…FU-008 not yet investigated (later rounds of this Task).

## Initial Request And Clarifications

- Task: all follow-ups of 515 in one Task; FU-003 first ("may ship in the next beta"); FU-004 is the founder's decision ("the team asks him directly"); the rest after; FU-001/FU-002 only if native use grows.
- The founder's direction for FU-003 (dispatch comment, his words read by the PM): "Why do we have a deadline so strange? I think make the deadline longer." PM's direction: make the start deadline longer (about 15–30 s), decide the number with a measurement under load, check the other short limits of this scope "so no other 'strange' short limit remains", no retry unless the measurement shows it is needed, keep the failure message clear.

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-11-17 | Code | `autobyteus-ts/src/tools/terminal/command-execution/native-command-process-scope.ts:23-46` | The start handshake | `start(invocation, deadline = Date.now() + 1500)`: anchor reports its pid (`handle.ready`), process-group check (`observer.establish`, one fresh `ps`), START confirmed (`handle.started`), all within one deadline; on a miss the command is stopped and the error rethrown | — |
| 2026-11-17 | Code | `shell-command-executor.ts:53, 70-73` | Caller | `scope.start(invocation, Date.now() + Math.min(1500, timeoutMs ?? 1500))`; a start error becomes `Command did not start: <error message>` with exit code null | The literal 1500 lives in two places |
| 2026-11-17 | Code | `process-group-observer.ts:29-44, 79` | `ps` reads | Each read runs `ps -axo …` with `timeout = Math.min(500, deadline - Date.now())`: **a second fixed 500 ms cap inside any deadline**; `snapshot` default deadline 500 ms; the WSL kill runner also capped at 500 ms | Raising only the start deadline would still fail with "Process observation deadline exceeded" |
| 2026-11-17 | Code | `native-command-process-scope.ts:48, 55, 81, 92, 116, 134` | Other limits of the scope | `members` default 500 ms; `stop` 3 s (confirms the group is gone: ≥ 3 `ps` reads, TERM after the first, KILL after a 500 ms grace); cancel-gate exit wait 500 ms (a grace before SIGKILL); TERM→KILL grace 500 ms; `retireCompleted` 500 ms (background, retried every 1 s by maintenance); `close` (host shutdown) 3 s | Classified in RF-005 |
| 2026-11-17 | Code | `anchored-command-launcher.ts:86-93, 142-153, 179-180` | Does a broken launch wait for the deadline? | No: an anchor `error`, `exit`, lost control or cancel rejects `ready`/`started` at once | A longer deadline only bounds a hung handshake |
| 2026-11-17 | Code | `tools/run-bash.ts:18, 34` | Tool timeout | `run_bash` default `timeoutSeconds = 30`; the start deadline is capped by the call's timeout; background form: no timeout | — |
| 2026-11-17 | Command | `uptime`, `sysctl -n hw.ncpu` | Machine state during the probes | 10 CPUs; load averages 133–184 throughout (other builds, runtimes and test servers) | Real heavy load, as in the 515 failures |
| 2026-11-17 | Doc | `tickets/done/native-tool-search-515/follow-ups.md` FU-003, `evidence/API-01-*` | Prior evidence | 30/60 failed on the 515 branch, 60/60 on its base; full suites failed the same way | — |

## Runtime, Probe, Or Reproduction Findings

All 2026-11-17, against the built `autobyteus-ts` of this worktree, on the desktop Mac under the load above.

| ID | Method / Command | Scenario | Observation | Established | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- | --- | --- |
| RF-001 | `node evidence/run-bash-burst-probe.mjs <worktree> 60` and `… 200` (the 515 API-01 probe: N `runBash` calls at once; checks exit 0 and complete stdout) | Unchanged build, load 142–149 | **60/60 and 200/200 failed**: `Command did not start: Command control deadline exceeded` (50 / 142) and `… Process observation deadline exceeded` (10 / 58) | `Reproduced` | Failure is real and total under bursts | this table |
| RF-002 | `node evidence/measure-command-start-handshake.mjs <worktree> 60` (real scope and launcher, 120 s start deadline, `ps` timeout removed through the injectable runner; times each step) | 60 at once, load ~147 | Start handshake p50 2,574 ms, max 2,908 ms (**60/60 over 1.5 s**); anchor ready max 1,982 ms; `ps` read p50 973 ms, max 2,136 ms (14/64 over 1.5 s, most over 500 ms); 0 errors | `Measured` | Healthy starts need seconds under a burst | this table |
| RF-003 | same, `1 15` (one command at a time, 15 rounds) | Single command, load ~135 | Start p50 98 ms, max 195 ms; `ps` max 211 ms; 0 errors | `Measured` | One agent's single call starts fast even under load; the failures come from **bursts** of starts (each runs its own fresh `ps`) | this table |
| RF-004 | same, `200 1` | 200 at once, load ~134 | Start p50 17,053 ms, p99 18,423 ms, max 18,429 ms (194/200 over 15 s, **0 over 30 s**); `ps` read max 14,663 ms; 0 errors | `Measured` | 15 s is too short for a heavy burst; 30 s covers the measured worst with 1.6× margin | this table |
| RF-005 | Temporary diagnostic (below): candidate limits applied to the built JS, then `run-bash-burst-probe.mjs` 60, 200, 60, 200 | Candidate values, load 157–184 | **0/60, 0/200, 0/60, 0/200 failed**; every stdout complete; slowest whole call 6.1 s / 25.6 s / 3.5 s / 14.4 s | `Reproduced` (fix shape) | Candidate values remove the failure without a retry; the 1 s end-marker grace truncated nothing in 520 calls | this table |

- Temporary diagnostics: in this worktree only, `autobyteus-ts/dist/tools/terminal/command-execution/{native-command-process-scope,shell-command-executor,process-group-observer}.js` edited with `sed` to start 30 s, `members`/`snapshot`/retirement 10 s, `stop` 30 s, `ps` read bounded by the caller's deadline only; **removed** by `pnpm -C autobyteus-ts build` (verified: `Date.now() + 1500` back in the built scope). No source file changed.
- Reproduction for implementation to start from: `evidence/run-bash-burst-probe.mjs <worktree> 60` fails on the unchanged build under a burst; it must pass after the change. `evidence/measure-command-start-handshake.mjs` gives the step timings. Both need `pnpm -C autobyteus-ts build` first; a burst of 60–200 calls produces the contention itself even on a quiet machine (RF-003 vs RF-002).

### RF-006 — Inventory of the scope's short limits and their classification

| Limit (today) | Where | What it bounds | On a miss | Class | Decision |
| --- | --- | --- | --- | --- | --- |
| 1.5 s start | `start` default; executor `Math.min(1500, …)` | Start handshake (pid, group check, START) | Command stopped; "Command did not start" | **Deadline that fails a command** | 30 s, still capped by the call's own timeout |
| 500 ms per `ps` read | `ProcessGroupObserver.read` | One `ps` run inside any deadline | Read fails → caller's step fails | **Hidden cap inside deadlines** | Removed: a read is bounded by its caller's deadline |
| 500 ms WSL kill | `observer.signal` (WSL) | One `wsl kill` run | Signal fails → stop unconfirmed | Hidden cap | Bounded by the caller's deadline (same rule) |
| 500 ms `members` / `snapshot` default | scope / observer | Observation for inspection | Error | Default deadline | 10 s |
| 500 ms retirement | `retireCompleted` | Confirm a finished command's group is empty, release it | `unconfirmed`, retried next second | Background deadline | 10 s (else never succeeds while `ps` > 0.5 s) |
| 3 s stop | `stop` default | Confirm a stopped group is gone (TERM sent after the first read) | `unconfirmed` stop outcome | Confirmation deadline | 30 s |
| 500 ms cancel-gate wait | `drain` | Grace for a gated anchor to exit before SIGKILL | SIGKILL (intended) | **Grace, not a deadline** | Kept |
| 500 ms TERM→KILL | `drain` | Grace between TERM and KILL | KILL (intended) | Grace | Kept |
| 1 s end-marker wait | executor | Grace for the stdout end marker after FOREGROUND_DONE | Returns output read so far | Grace | Kept (no truncation in 520 calls under load, RF-005) |
| 3 s close | `close` (host shutdown) | Whole scope shutdown | `unconfirmed` outcomes reported | Shutdown budget | Kept: the server's shutdown is itself bounded at 10 s (autobyteus-515 FU-007 / this Task's FU-007); signals are still sent |
| 1 s maintenance tick | `setInterval` | Retirement cadence | — | Cadence | Kept |

## Requirement Implications

- The founder's "strange" limit is two limits: the 1.5 s start deadline and a 500 ms cap on every `ps` read inside it. Both must change.
- 30 s is the measured choice (RF-004/RF-005); no retry needed.
- A genuine launch failure still reports at once; only a hung handshake waits longer.

## Notes For Architecture Design

The limits belong in one named place owned by the command-execution module; the executor uses the start limit instead of its own literal; the failure message names the limit that was exceeded.
