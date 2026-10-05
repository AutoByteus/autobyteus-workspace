# IR-014 Local Implementation Checks (DR-003 latest-base integration)

Local implementation checks only, not API/E2E sign-off. Merge commit `e94d83538` (parents `b6755585a` and origin/personal `fc79fad14`).

| # | Command | Result | Log |
| --- | --- | --- | --- |
| 1 | `git merge --no-edit origin/personal` | 1 content conflict (`agent-run.ts`), resolved; `built-in-agent-registry.ts` and the bootstrapper test auto-merged with upstream-only changes (Daily Assistant rename) | — |
| 2 | `pnpm -C autobyteus-server-ts exec tsc --noEmit -p tsconfig.build.json` | exit 0 | — |
| 3 | Termination-sensitive suites: `agent-run.test.ts`, `agent-run-termination-service.test.ts`, Claude and Codex `*-input-terminal-release.test.ts`, configured handle, terminal-publication suites, all of `tests/unit/agent-execution` and `tests/unit/built-in-agents` | 128 files pass; 3 files / 4 tests fail, all in the pre-existing baseline (agent-api-status-projectors 2, provisioning 1, autobyteus-status-projector 1) | `termination-focused.log` |
| 4 | Wide: `tests/unit tests/architecture tests/integration/agent-team-execution` + the 2 Projects e2e files | 4785 Pass / 82 Fail / 6 Skip; failing names byte-identical to `../ir-013/wide-failed.names` (pre-existing baseline) | `wide-unit.log`, `wide-failed.names` |
| 5 | Upstream `tests/e2e/agent-definitions/general-agent-identity.e2e.test.ts` | 2/2 Pass | — |
| 6 | `git diff --check` on own edits | exit 0 (cached warnings exist only in incoming upstream `tickets/done/**` evidence logs) | — |

Not run: the API-REV-020 `projects-startup-migration.e2e.test.ts` (needs a rebuilt `dist/`; API/E2E-owned). No docs resync, because that is Delivery's; stash `76b8fd003` was left untouched.
