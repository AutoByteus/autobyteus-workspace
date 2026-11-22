# IR-002 validation summary (implementation engineer, 2026-11-22)

- Server typecheck: production 0 errors; test files 974 in 300 files (baseline shrunk from 975/301). PASS. No web change this round.
- `tests/unit/agent-org-execution/container/org-delegated-run-messaging.test.ts` (new, 7 tests) through `send_message_to`
  (real dispatcher and global router): reach and related delivery from runs delegated by an agent unit, a Team unit member
  and the container itself; receiver stopped (restored) and live; unit → delegated run by run ID; `same_container`
  unchanged; view rule; converted chain line equals the live line. With the three changed source files stashed, 4 of its
  tests fail (they pass with them).
- `tests/unit/agent-collaboration/delegation/collaboration-tree-reach.test.ts` (17): B-4 through the container rule; 8 fail
  without the R-8 change.
- Collaboration, Org execution, communication, remote and Team execution suites: 148 files, 1030 tests pass.
- Rewritten on stored containers: `agent-org-run-history-catalog-service.test.ts` (8), `collaboration-root-history-public-projection.test.ts` (8),
  `collaboration-root-history-scoped.test.ts` (4); `result-catalogue.test.ts` (M-15 withdrawn).
- Full `tests/unit tests/integration tests/app-data-migrations`: the failures outside the environment list (token usage,
  Prisma, migration gate and record repository, upgrade paths) came from a concurrent e2e run resetting the shared test
  database (`tests/.tmp/autobyteus-server-test.db`, recreated); rerun alone they all pass (31 files, 269 tests), apart from
  M-15, fixed. The remaining failures are the environment list of IR-001.
- Built-server e2e (`pnpm build`; scripted AGY CLI): `org-follows-definition` OF-01 … OF-06 (OF-06 new: a copy the Team
  unit's lead delegated messages `/team/writer`: delivered, no `counterpart` on either line) and AOML-1/2 pass. Receipts in `org-follows-e2e/`.
