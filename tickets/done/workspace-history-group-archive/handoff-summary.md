# Handoff Summary — Workspace History Group Archive

## Current Delivery State
- Package `workspace-history-group-archive`; `/software_engineering_team/delivery_engineer`; **DR-001: awaiting user verification** (2026-10-08).
- `task_size=Medium`, `architectural_risk=Low`, direct low-risk route kept. Architecture review, source review and test-code review are **N/A — not applicable (direct route)**.
- Revisions: SR-003 / IR-001 / API-REV-001 / DR-001.
- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-history-group-archive`, branch `codex/workspace-history-group-archive`.
- Commits on base: `9faa6bc75` (feature), `85d2ec346` (GraphQL E2E), `dc70e7f44` (baseline stale-test repair, test-only). Delivery docs and ticket artifacts are uncommitted until finalization.

## What Changed (user-facing)
Agent, agent team and Agent Org group headers in the Workspaces sidebar have an **Archive all runs** icon. If any run of the group is running, nothing is archived and a toast says "Stop running runs first.". Otherwise a confirmation opens; on confirm, every saved run of that group in that workspace is archived. For agents this includes runs hidden by the 6-run cap. History refreshes once and one toast reports the result, e.g. "Archived 5 runs.". Archive is non-destructive; per-run Archive and Delete are unchanged. en and zh-CN strings are included.

## Integration And Validation Basis
- `git fetch origin personal` → `4a51482a5`, unchanged since bootstrap. HEAD contains it; 0 base commits missing. **Already current**: no merge, rebase or checkpoint needed.
- Delivery rerun on the integrated HEAD `dc70e7f44`:
  - `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/workspaces/archive-run-history-graphql.e2e.test.ts tests/unit/run-history/services/agent-run-history-service.test.ts --no-watch` → 15/15 Pass.
  - `pnpm -C autobyteus-web test:nuxt --run` on the group-archive composable, header, panel and store specs → 138/138 Pass.
  - Evidence: `delivery-evidence/dr-001/`.
- API-REV-001 (upstream), confidence 95.4%:
  - Archive E2E 6/6.
  - Server run-history, workspaces and GraphQL suites 343/343.
  - Full web suite 3960 pass, 0 fail, 3 skipped.
  - Web guards and the localization audit pass.
  - Live isolated-desktop validation of agent, team and Org (blocked toast, archive, Org route cleanup, zh-CN), with cleanup verified.
- Residual, spec-only (not rendered live): the AC-006 partial-failure toast, the REQ-006 pending state and the AC-010 UI race. AC-010 is proven at the server/GraphQL level (API-003).

## Docs Sync
`docs-sync-report.md` — **Updated**:
- `autobyteus-server-ts/docs/modules/run_history.md`
- `autobyteus-web/docs/agent_execution_architecture.md`
- `autobyteus-web/docs/agent_orgs.md`

## Open Points For The User / Solution Designer (non-blocking)
1. **Unclear (wording):** AC-005 rev quotes a longer blocked message. QR-003 specifies "Stop running runs first."; the implementation and docs follow QR-003.
2. A live run beyond the 6-run cap shows as a stopped `local` row, so the dialog opens before the server refuses. Nothing is archived. This is pre-existing projection behaviour and within REQ-004 rev.
3. An archived open standalone run stays open and reappears as a `local` row, also after reload. This is pre-existing and shared with per-run archive; separate-ticket candidate.
4. Token-usage numbers follow the host OS locale rather than the app language. This is a product question; only the test was pinned to en-US.

## Pending Decisions Before Finalization
- Explicit user verification of the feature.
- Release: publish a new version, or finalize without a release? Release notes are prepared in `release-notes.md`.

## Finalization Plan (after verification)
1. Move the ticket to `tickets/done/workspace-history-group-archive/`.
2. Commit and push the ticket branch.
3. Re-fetch `origin/personal`. If it has advanced, re-integrate and rerun checks.
4. No-ff merge into `personal` and push.
5. Optional release, only if the user asks for one.
6. Remove the worktree and local branch. The generated SDK `dist/` folders are never staged.
