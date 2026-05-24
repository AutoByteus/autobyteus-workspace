# Terminal Server-Side E2E Failure Analysis — 2026-05-24

## Classification

- Failure ID: `E2E-TERMFD-002`
- Classification requested by user: route to `solution_designer` if any problem is found.
- Validation result: `Fail`
- Scope: built backend Terminal WebSocket / PTY lifecycle under normal attached command-output sessions.

## Summary

Server-side Terminal E2E did run and the existing durable E2E passed, but the additional built-backend descriptor/timing probe found a new lifecycle gap that the existing durable E2E does not catch.

The actual WebSocket connect path is fast:

- Normal Terminal WebSocket open: p50 `2ms`, p95 `3ms`, max `4ms`.
- Actual command output after shell start: p50 `290ms`, p95 `349ms`, max `410ms`.
- Close call: p50 `1ms`, max `1ms`.

However, after eight normal attached Terminal sessions that ran a real command and closed, the backend process open FD count rose from `37` to `59` and stayed there after additional early-close/abort cycles. Child process count returned to `0`, but final `lsof` still showed `16` PTY-related or revoked descriptors (`/dev/ptmx` and `(revoked)`).

## Evidence

Existing durable server-side Terminal E2E:

- Command log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round9-server-terminal-e2e-20260524.log`
- Result: pass, 1 file / 3 tests.
- Timings from Vitest:
  - real PTY cwd test: `1504ms`
  - invalid cwd rejection: `8ms`
  - close-before-connect/repeated churn: `544ms`

Built-backend timing and descriptor probe:

- Script: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round9-terminal-server-connect-timing-v2-20260524.mjs`
- JSON: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round9-terminal-server-connect-timing-v2-20260524.json`
- Run log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round9-terminal-server-connect-timing-v2-20260524.run.log`
- Server log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round9-terminal-server-connect-timing-v2-20260524-server.log`
- Final lsof: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round9-terminal-server-connect-timing-v2-20260524-final-lsof.log`

Descriptor samples from the probe:

| Sample | FD count | Child processes |
| --- | ---: | ---: |
| `baseline_after_health` | 37 | 0 |
| `after_invalid_cwd` | 37 | 0 |
| `after_8_normal_runs` | 59 | 0 |
| `after_25_early_close_final_wait` | 59 | 0 |
| `after_10_abort_before_open_final_wait` | 59 | 0 |

Per-normal-session FD samples after close:

| Session | FD count after close | Child processes after close |
| --- | ---: | ---: |
| `normal-1` | 41 | 0 |
| `normal-2` | 42 | 0 |
| `normal-3` | 44 | 0 |
| `normal-4` | 47 | 0 |
| `normal-5` | 50 | 0 |
| `normal-6` | 53 | 0 |
| `normal-7` | 56 | 0 |
| `normal-8` | 59 | 0 |

Final `lsof` still included PTY-related descriptors such as `/dev/ptmx` and `(revoked)` entries even though server logs reported each PTY session closed and `childCount` was `0`.

## Why the existing durable E2E was insufficient

The durable E2E verifies `PtySessionManager.sessionCount` returns to `0`, but it does not count operating-system descriptors after normal attached command-output sessions. It can therefore pass while the server process retains PTY-related file descriptors.

The existing real-cwd durable test also waits for a marker string that is present in the echoed shell input. The Round 9 timing probe avoided that false-positive path by writing a `.terminal_probe_marker` file and waiting for `cat .terminal_probe_marker` to output `ROUND9_ACTUAL_COMMAND_OUTPUT`, proving the command actually executed before close.

## Routing Recommendation

Route back to `solution_designer` per the user's explicit instruction because the problem affects the Terminal lifecycle/descriptor-pressure acceptance boundary after the broader refactor. The design/requirements should decide whether to add explicit descriptor-level acceptance for normal attached Terminal open/run-command/close churn, not only close-before-connect and session-count cleanup.
