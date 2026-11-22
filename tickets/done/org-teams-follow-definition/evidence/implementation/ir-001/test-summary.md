# IR-001 validation summary (implementation engineer, 2026-11-22)

All runs in the ticket worktree's container (`/home/autobyteus/workspace/.codex/worktrees/org-teams-follow-definition`), as root,
with hand-built data only (never real data or a copy of it).

## Typechecks

- Server (`node ./scripts/typecheck.mjs` in `autobyteus-server-ts`): production 0 errors; test files 975 in 301 files (the
  baseline). PASS.
- Web (`pnpm -C autobyteus-web typecheck`): production 0 errors; test files 86 in 36 files (the baseline). PASS.

## Server suites (`pnpm exec vitest run tests/unit tests/integration tests/app-data-migrations`)

- Test files: 1101 passed, 13 failed, 24 skipped (1138). Tests: 8874 passed, 28 failed, 80 skipped (8982).
- The 13 failing files are environment-dependent and touch no Org data (also failing before this ticket's slices 5 … 8):
  - package watchers: `agent-package-folder-watcher`, `unreadable-package-root`, `package-auto-refresh` (no built watcher runtime);
  - application backend and Brief Studio: `brief-package-team-prompt`, `brief-studio-agent-tool-mcp`, `brief-studio-imported-package`,
    `brief-studio-team-config`, `standalone-application-server`, `standalone-package-portable-defaults` (no built application `dist/`);
  - `socratic-live-tutor-renderer`, `socratic-runtime-lifecycle`, `app-config` (env text);
  - `studio-server-http-contract` (the test client address is admitted in this container: 403 expected, 200 got).

## This ticket's suites

- `tests/app-data-migrations/agent-org-units-own-runs-v1/` (19): every released shape, contract §1 … §6, §9, §11, rotated unit
  logs, activation state, retry/partial, repeat start, bad Org, tree-less Org, reader wait, JSON-log wait, registry
  classification, late writer/reader/rebuild, cost: `[org-units-migration-cost] 10 Teams, 40 agents, 40000 lines (~9 MB): ~190 ms`.
- `tests/app-data-migrations` overall: 103 files, 834 tests with `tests/unit/remote-collaboration` (all pass).
- `tests/unit/agent-org-execution/membership/org-follows-definition.test.ts` (9), `tests/unit/remote-collaboration/peer-run-members.test.ts` (4),
  `tests/integration/agent-org-execution/org-container-stored.integration.test.ts` (stored Org rows through units).
- Web: `components/workspace/history/__tests__/WorkspaceAgentOrg*.spec.ts` (20, including the Leaving tag).

## Built-server e2e (`pnpm build`, then `dist/app.js`; scripted AGY CLI, no provider inference)

- `tests/e2e/agent-org-runs/org-follows-definition.e2e.test.ts` (new): OF-01 … OF-05 pass; receipts in `org-follows-e2e/`.
- `tests/e2e/app-data-migrations/append-only-message-logs-startup.e2e.test.ts` (AOML-1, AOML-2): pass. AOML-2 builds a released
  Org from what this build wrote, then one start converts its log (20261018) and the Org (20261122); the director messages
  the analyst across the two converted units with a real tool call (one line in each unit's rotated active log; sealed files
  unchanged).
- `team-run-v1-production-upgrade` (4), `task-agent-own-run-startup` (TAU-1; TAU-2 skips as root),
  `removed-skill-access-mode-history-graphql`: pass.
- Environment failures in `tests/e2e/app-data-migrations` (no Org data): `node-vocabulary-stored-names-startup` (no `sqlite3`
  binary), `remove-built-in-project-task-manager-startup` E-002/E-004 (root cannot be refused the removal),
  `remove-retired-built-in-agents-startup` RRB-1 and `remove-skill-improvement-data-startup` SID-2 (their byte snapshot opens
  the node's control socket: ENXIO). Not re-run on the base build here.
