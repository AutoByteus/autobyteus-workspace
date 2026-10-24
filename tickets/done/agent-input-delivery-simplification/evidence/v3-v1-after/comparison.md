# V-1 comparison: full server suite, baseline vs after

- Baseline: clean `0216c6fb14` (`../v3-v1-baseline/`): 8274 tests, 24 failed.
- After: `dbc27db9df` (`commit.txt`): 8309 tests, 7748 passed, 24 failed, 537 skipped. 2533 suites.
- Both runs: `vitest run --exclude "tests/probes/**"` after `pnpm -C autobyteus-server-ts build` (BUILD_EXIT=0).

## Failures

`diff <(sort ../v3-v1-baseline/baseline-failures.txt) after-failures.txt` is empty. The same 24 tests fail in both runs: application-backend, update-notification and remote-access suites, none in the changed code.

## Test-count difference (+35), by file

| File | Baseline | After | Why |
| --- | --- | --- | --- |
| `unit/agent-collaboration/execution/communication/root-message-append.test.ts` | – | 12 | new (append unit) |
| `unit/agent-collaboration/root-communication-baseline-contract.test.ts` | – | 12 | new (V-2/V-3; it was committed after the baseline run) |
| `unit/agent-collaboration/root-communication-task-closure.test.ts` | – | 12 | new (V-4) |
| `unit/services/team-communication/team-communication-message-append-plan-current.test.ts` | 1 | – | deleted; its assertion moved into the append unit test |
| `unit/services/team-communication/team-communication-service.test.ts` → `team-communication-port.test.ts` | 5 | 5 | renamed with the facade removal |
| `unit/agent-team-execution/inter-agent-message-router-claude-input-admission.test.ts` → `teammate-input-claude-active-turn-admission.test.ts` | 1 | 1 | renamed with the router removal |

Every other file has the same test count. No other difference.
