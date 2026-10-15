# Docs Sync Report

## Scope

- Ticket: `stale-e2e-test-baseline-fix`, `Small` / `Low`, direct route (architecture, code and test-code review: N/A — not applicable). Test-only baseline fixes under TESTING.md Rule 9. No product change.
- Trigger: the validated package from `api_e2e_engineer` (API-001 Pass, 96%), 2026-10-14.
- Integrated base: `origin/personal` @ `50b7436229`, re-fetched at delivery start and unchanged.

## Result

- Docs impact: `No impact`.
- Rationale:
  - Only two E2E test files changed (`agent-package-private-skills.e2e.test.ts`, `agent-team-definitions-graphql.e2e.test.ts`); no source file changed.
  - No long-lived doc describes these suites. `TESTING.md` lists no stale-test exception for them; its only known exception, in `agent-status-websocket`, is unchanged.
  - The `TESTING.md` build note stays correct. The Org-run E2E suites need `pnpm -C autobyteus-server-ts build` first and say so themselves.
- Removed or replaced: the nested-Team cases of `agent-team-definitions-graphql.e2e.test.ts` are dropped, because nested Teams no longer exist since `37d05c7f71`. Registered-package saves stay covered by `registered-package-definition-edit.e2e.test.ts`.
