# Handoff — mcp-bulk-import-errors (SR-001): Architecture Design Complete

- Result: **Architecture Design Complete**, `task_size=Small`, `architectural_risk=Low`
- Package: `mcp-bulk-import-errors`; Project Task `autobyteus-190`
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`)
- Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-bulk-import-errors`, branch `codex/mcp-bulk-import-errors`, base `origin/personal` @ `41be799edb`; finalization target `origin/personal`
- Approval: Solution Designer within the Task's direction (user informed 2026-10-20)
- Artifacts (in `tickets/in-progress/mcp-bulk-import-errors/`): `requirements-doc.md`, `investigation-notes.md`, `design-spec.md`, `solution-revision-record.md`, this file
- Architecture review: `N/A — not applicable`

## Original request

Return the per-entry error (name and reason) in the bulk import result and show it in the MCP import UI, keeping the counts. Accept the app's own `mcps.json` shape by inferring the transport from `url` or `command`. Done when an invalid entry shows which entry failed and why in the API and the app, an import of the app's own entries succeeds, there are tests, it's merged, and it ships with the next release.

## Design summary

1. Core `parseMcpConfigDict` infers the transport when missing (`url` → streamable_http, `command` → stdio, neither → a clear error). The file loader drops its duplicate rule.
2. The server import collects `{serverId, reason}` per failure. GraphQL `ImportMcpServerConfigsResult.failures` is additive. Reasons never contain env/header/token values.
3. Web: read `importedCount` (it read `imported_count`, so there was no refresh and partial imports were misreported); show the failure list and stay open on failures; refresh when anything was imported; en + zh-CN.
4. Remove the dead `applyAndRegisterConfigsFromJson` and its integration test.

## Verification intent

AC-001…AC-006: core, server and web unit tests; server e2e via GraphQL; an app `mcps.json` round trip; existing loader tests green.

## Route Record
- 2026-10-20: `get_handoff_rules` matched "Architecture Design Complete with task_size=Small or Medium and architectural_risk=Low". Recipient: `/software_engineering_team/implementation_engineer`.
