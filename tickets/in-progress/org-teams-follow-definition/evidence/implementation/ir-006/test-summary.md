# IR-006 validation summary (implementation engineer, 2026-11-22)

State: merge `21622d75e9` (`origin/personal` `f2c0d2a902`) plus the IR-006 commit.

- Server typecheck: production 0 errors; test files 973 in 300 files (= the merged baseline). PASS.
- Full suite on the merged state, before SR-017/SR-018 (`tests/unit tests/integration tests/architecture tests/app-data-migrations`): 1166 files, 9117 tests pass. 10 tests fail:
  - known environment failures on this machine (my environment notes): the agent-package folder watcher (4), the unreadable package root (2), `package-auto-refresh` "unreadable package folder", app-config "read-only", the studio server HTTP contract, and two Socratic files that fail to load. All are chmod or root, or missing built-in modules;
  - `agent-org-units-late-predecessors` classification, which I was editing for SR-018 while the run was in progress (it passes after).
- After SR-016..SR-018: `tests/architecture`, `tests/app-data-migrations`, `tests/unit/agent-org-execution`, `tests/integration/agent-org-execution`, `tests/unit/remote-collaboration`, `tests/unit/agent-collaboration`, `tests/unit/agent-team-execution`, `tests/integration/agent-team-execution`, `tests/unit/standalone-application-host`, `tests/integration/collaboration-definition-admission`, `tests/unit/agent-execution`, `tests/unit/run-history`, `tests/unit/services`: 525 files, 4469 tests pass, 8 skipped. Run alone, no concurrent vitest.
- New tests failing without their fix: `agent-org-units-path-rewrite.test.ts` fails 9 of 10 with the migration source at HEAD. The interrupt-after-pass case also holds with the old order.
- Cost (one conversion with its node pass): synthetic large Org (10 Teams, 40 agents, 40,000 log lines, ~9 MB) plus 200 agent runs and 120 Team members, with 256 KB traces and 64 KB logs (~140 MB): **838 ms**. The large Org alone (existing cost test): 278 ms. The node's sizes are assumed; no user data was read.
- Built server (`pnpm build`, scripted AGY CLI), run one after the other:
  - `org-follows-definition`: 6/6 (receipts in `org-follows-e2e/`);
  - `append-only-message-logs-startup`: 2/2;
  - `remote-delegation-two-server`: 62/62, RC-56 (FU-003 on the base's node path) included;
  - `org-container-package` and `stopped-org-workspace-graphql`: 14/14.
