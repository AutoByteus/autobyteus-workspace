# Handoff Summary — remove-built-in-project-task-manager

## Status

- Delivery state: **DR-003. Explicit user acceptance received; final integration/checks passed. Repository finalization and NEW BETA publication in progress.**
- Classification (unchanged by delivery): `task_size=Medium`, `architectural_risk=High`. Route: full independent review (Solution Designer → Architecture Review → Implementation → Code Review → API/E2E → Code Review (test code) → Delivery).

| Stage | Revision | Result |
| --- | --- | --- |
| Requirements / design | SR-001 (approved 2026-10-06), SR-002 (design) | Approved |
| Architecture review | see `architecture-review-revision-record.md` | Pass |
| Implementation | IR-001 (`62af418df`) | Done |
| Code review | CRR-001 source Pass 9.5/10; CRR-002 test-code Pass | Pass |
| API/E2E | API-REV-001 | Pass, confidence 95.7% |
| Delivery | DR-003 | Explicit user acceptance; final integrated checks passed; finalization/new beta in progress |

| Item | Value |
| --- | --- |
| Worktree | `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-built-in-project-task-manager` |
| Ticket branch | `codex/remove-built-in-project-task-manager` (local, not pushed) |
| Finalization target | `origin/personal` |
| Validated candidate | `62af418df` plus the API/E2E durable tests and ticket artifacts, committed as delivery checkpoint `be480b5fb` |
| Integrated base | `origin/personal@db39803d4`: 7 commits from the `run-file-change-live-projection-ownership` ticket (run-file-change services, tests, docs, ticket receipts). Merge `f928bfed3`, no conflicts, no overlap with this ticket's files. |
| Post-integration checks | `pnpm -C autobyteus-server-ts build` passed (`delivery-evidence/build-integrated.log`), including the sanitized built-in smoke. The server vitest run covered the new E2E, app-data migrations unit and integration, built-in-agents and run-file-changes: 55 files / 369 tests passed (`delivery-evidence/vitest-integrated.log`). Web `test:nuxt` for agents, collaborators and runHistoryStore: 4 files / 57 tests passed (`delivery-evidence/web-integrated.log`). |
| Not committed (by design) | `autobyteus-application-backend-sdk/dist/`, `autobyteus-application-sdk-contracts/dist/` (prebuild output) |

## What Changed (for you)

1. The server no longer ships the built-in Project Task Manager (`autobyteus-project-task-manager`). Its registry row and template are deleted, and the web built-in mirror drops the ID.
2. New required startup migration `20261006_remove_built_in_project_task_manager`. It deletes `<appData>/agents/autobyteus-project-task-manager/` once, without a backup. A missing folder is skipped. If deletion fails, the migration records `FAILED`, does not block startup and retries on the next start.
3. Nothing else changes. Old conversations with the retired agent stay readable but cannot be continued. Projects, Tasks and their tools are unchanged. Other built-ins and package-root agents, including the agent repository's `project-task-manager`, are untouched.
4. Docs: the server README, the server and web `projects.md`, and `TESTING.md` were updated during implementation. `docs/modules/agent_definition.md` was updated in delivery with the rule for retiring a built-in (`docs-sync-report.md`).

## Verification Evidence

- API/E2E: `api-e2e-execution-coverage-report.md`, `api-e2e-test-case-ledger.md` and `api-e2e-evidence/`. The evidence includes a real beta-to-new cross-version upgrade (TMP-001) and browser rendering of an old run (TMP-002 screenshots).
- New durable E2E: `autobyteus-server-ts/tests/e2e/app-data-migrations/remove-built-in-project-task-manager-startup.e2e.test.ts`, using a frozen beta fixture from `tests/fixtures/app-data-migrations/retired-built-in-project-task-manager/`. A negative control fails 4/4 when the migration is unregistered.

## Residual Risks / Non-goals

- The packaged Electron shell was not exercised. It uses the same server `dist/app.js` startup path, and no shell code changed.
- SCN-007 (downgrade) is unsupported, and PREM-001 is contrived. Both are recorded upstream.
- A pre-existing typecheck issue (TS6059 rootDir) is unrelated to this ticket.
- Users only see the replacement "Project Task Manager" if the agent repository is configured as a package root. That is out of scope by design.

## How To Verify

- Start the app or a server from this worktree against app data that an earlier version used, so it contains `agents/autobyteus-project-task-manager/`. Check that the folder is gone after startup. Check that, with the agent repository configured, the agent catalog and `@` show exactly one "Project Task Manager". Old Project Task Manager runs should still open in history.
- Automated re-check:
  - `pnpm -C autobyteus-server-ts build`
  - `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/app-data-migrations/remove-built-in-project-task-manager-startup.e2e.test.ts tests/unit/app-data-migrations tests/integration/app-data-migrations tests/unit/built-in-agents`
- `release-notes.md` is prepared in case you want a release.

## DR-002 Current Resumption State

- User direction via Solution Designer: “send a message to delivery engineer to finalize and release”; clarified “i meant release a new beta version”. Stable release is not authorized. This is not evidence of personal user testing.
- Existing local delivery edits protected in checkpoint `db77f6035`; latest target `origin/personal@f777a6559` merged without conflicts as `0f66ad7a0`. The old integrated-base row above records DR-001 history only.
- Current checks: server build Pass; server suites 59 files / 390 tests Pass, 1 file / 3 tests skipped (opt-in AGY task-closure suite); web 4 files / 57 tests Pass. Removal startup E2E 4/4 Pass. Hygiene Pass. Exact commands/receipts in `delivery-evidence/dr-002/integration-verification.json`.
- Docs rechecked; no new intended behavior or documentation impact. Classification remains Medium / High, full independent-review route.
- **Remaining gate:** explicit user verification acceptance. Asked the user whether they accept documented automated/API/E2E verification and authorize proceeding without a personal app test, or prefer to test first. Awaiting answer.
- No finalization push/merge, archive, beta tag, release workflow or cleanup performed in DR-002. Worktree stays intact. The current release report is authoritative.
- Upon acceptance: refresh target again; if materially changed, integrate/check and obtain renewed verification. Archive ticket, commit/push ticket, update/merge/push personal, run the documented beta helper exactly once, verify publication/rollout and clean safely. The shared personal checkout has unrelated dirty files, so use an isolated clean finalization clone rather than overwriting them.

## DR-003 Latest Authority

- User response to acceptance question: “now finalize and release a new beta”. `user-verification-record.md` records evidence acceptance, NOT personal testing. Previous DR-002 hold is resolved.
- Latest base `8e9f855a9`, integrated `526bac6a3`; no material removal behavior change/no renewed verification required. Build + 369 server tests + 64 web tests + final sanitized smoke Pass.
- Ticket archived before final commit. Finalization target personal; one new beta via documented helper. Precise repository/publication/cleanup receipts will be appended to current release report.
- Full cumulative artifact manifest will accompany the terminal receipt; historical upstream absolute in-progress paths are remapped there to durable done paths.
