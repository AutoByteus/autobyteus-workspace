# Handoff Summary — claude-sdk-canonical-model-ids

- Status: **User-verified and finalized into `personal`; no release** (delivery DR-002). The user tested the local Electron build and wrote "i have tested. the task is done. lets finalize." and "no need to release a new version".
- Classification: `task_size=Medium`, `architectural_risk=Low`, route `Direct` (architecture review, code review and API/E2E test-code review: `N/A — not applicable`)
- Revisions: SR-003 (solution), IR-001 (implementation), API-REV-001 (API/E2E Pass, 95% confidence), DR-001/DR-002 (delivery)
- Final integration: `origin/personal` @ `73f1c5fef` merged into the ticket branch after verification (Claude built-in tool restriction only; picker behavior unaffected). Rechecks passed: server 44/44, server build typecheck, web 33/33.

## What changed for the user

Claude Agent SDK model pickers now list one option per real model, labeled with the canonical model ID (e.g. `claude-opus-5-5[1m]`). Claude's display name and description appear as secondary text, and the recommended model carries a **Recommended** badge and is listed first. The selected field reads `Anthropic / <canonical ID>`. Saved values such as `default` keep opening and running unchanged. See `dropdown-preview.md` §2–§4a for the approved behavior.

## Workspace / integration state

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-canonical-model-ids`
- Ticket branch: `codex/claude-sdk-canonical-model-ids` @ `23e72c3fa` (implementation commit), plus uncommitted delivery changes:
  - the API/E2E integration-test update
  - 3 long-lived docs updates
  - the ticket artifacts
- Finalization target: `origin/personal`
- Latest base checked: `origin/personal` @ `9267d11c8`, unchanged since bootstrap. Integration method: `Already current`; no merge needed.
- Post-integration check: I reran focused tests on the candidate even though no base commits were integrated.
  - Server `vitest run tests/unit/runtime-management/claude/client tests/unit/api/graphql/types/llm-provider.test.ts`: 43/43 passed.
  - Web `vitest run` of the `modelSelectionOptions`, `selectItemMatch`, `modelSelectionLabel`, `SearchableGroupedSelect` and `RuntimeModelConfigFields` specs: 33/33 passed.
- Untracked build output `autobyteus-application-sdk-contracts/dist/` and `autobyteus-application-backend-sdk/dist/` is test scaffolding and will not be committed.

## Validation evidence (from API/E2E)

- Live browser plus real Claude CLI 2.1.281 covered E2E-01..08:
  - GraphQL canonical IDs and fold
  - agent run config, team run config (AC-007) and member override
  - launch persistence (`default`, `sonnet` and `opus[1m]` unchanged) and a real turn with `default`
  - the existing-run Settings editor and the messaging binding picker
  - unchanged Codex/AutoByteus pickers
- Live integration test `claude-model-catalog.integration.test.ts` passes with `RUN_CLAUDE_E2E=1`.
- Broader-suite failures are pre-existing and identical on base:
  - server: 6 failures
  - web: 2 in `WorkspaceAgentRunsTreePanel.regressions`

## Docs

- `autobyteus-server-ts/docs/modules/llm_management.md`
- `autobyteus-web/docs/agent_execution_architecture.md`
- `autobyteus-web/docs/settings.md`

See `docs-sync-report.md`.

## Residual risks

- The application launch-profile picker was not browser-tested. It uses the same builder/select chain and its component tests pass.
- The §4c no-canonical-ID fallback is unit-tested only.
- Dark mode and narrow viewports were not inspected.
- Live model ID strings vary by Claude CLI version.
- Environment note: one `token_usage_run_records` row (id 66933) was written to the user's real DB during API/E2E. The user was informed and accepted it.

## Persisted data

`Not Affected`: no stored shape or value changed, and no migration.

## How to verify

Open any agent or team run config, pick runtime **Claude Agent SDK**, open the model dropdown, and check the following:

1. Model IDs are shown with a Recommended badge.
2. The selected field reads `Anthropic / <ID>`.
3. An existing config saved with `default` shows the Recommended option with no warning.
