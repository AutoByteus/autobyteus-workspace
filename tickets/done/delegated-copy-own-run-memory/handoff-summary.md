# Handoff Summary — delegated-copy-own-run-memory (Task 8641c0ac)

- Large / High, reviewed route:
  - architecture review ARCH-REV-004;
  - code review CRR-007 9.3/10, and CRR-009 9.3/10 on the merged state;
  - test-code review CRR-008 and CRR-010;
  - API/E2E API-REV-003 94% (pre-merge), API-REV-004 94% (merged state).
- Change: a task agent (a delegated Agent or Team run) is a run of its own, with its own folder, `run_metadata.json` (`taskAgent` section) and message log. The coordinating run keeps links only. Messages are stored per run (the email model). The Memory page lists agent task agents under their definition name (DEC-018). Deleting a coordinating run keeps its task agents' memory.
- Migration: `20261017_task_agent_own_run_v1`, at startup, one-way (downgrade unsupported, DEC-006).
  - It is registered last, after upstream's `project-task-keys-v1`.
  - A run waits (`WAITING_FOR_PREDECESSOR`) only while an earlier tree-writing migration that can still convert it has not succeeded. Otherwise it is kept with a warning (`PRESERVED_UNSUPPORTED_TREE`). Every other run migrates meanwhile.
- Integration:
  - DR-001 merged `origin/personal` `2d076088dd` cleanly, but the full merged-state rerun failed 5 e2e files. This went to implementation as a Local Fix.
  - IR-004 (`217430a404`) and `004a3a965b` fixed them (tests only), and they were re-reviewed and re-validated.
  - DR-002 merged `cba5563a5d` (another ticket's records only), so no rerun was needed.

## Verification (from evidence; no user check)

- API-REV-004 on the merged build:
  - unit 5842, web 4473, integration 393 (plus the 2 known `agent-status-websocket`, Task 4577620f);
  - whole server e2e: 112 files pass, including `team-run-v1-production-upgrade` 4/4, both token-usage backfill tests, model-metadata, TAU 3/3 and memory-sync-multiprocess;
  - UC-2 passed 3/3 after `004a3a965b`; the only remaining failure is terminal-websocket-lifecycle (Task 0c7efc37).
  - I opened round3 `M2-unit.log`, `M3-integration.log`, `M5-web.log`, `M6-e2e-all.log` and `UC-fixed-1..3.log`.
- My own delivery rerun on the first merge (`evidence/delivery/`) agrees on unit, web and integration, and found the failures that IR-004 fixed.
- The AC-016 real-app upgrade (pre-merge) used data written by the released app on a test-owned data root, never user data:
  - 15/15 task-agent files byte-identical;
  - views identical;
  - the migrated copy woke and answered from its earlier conversation;
  - delete keeps the task agents' memory;
  - a second start changes nothing.
- Credentials: the evidence and branch history were scanned for the user's provider keys and Codex tokens, with 0 matches.

## Release

- None requested. release-notes.md is ready and states the one-way upgrade.

## Follow-ups (with /project_task_manager)

- FU-1 `getTeamAgentRunLocation`
- FU-2 the 20260701 migration on a fresh ledger
- FU-3 baseline repair
- FU-4 narrowing task-team records (mind the frozen classifier)
- FU-6 load-sensitive 5 s bounds
- FU-7 shared e2e DB isolation
