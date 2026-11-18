# Handoff Summary: list-projects-workspaces-384 (autobyteus-384)

- **Status:** verified from the evidence and finalized into `personal`. Released in a new beta, as the user decided (DEC-004); see `release-deployment-report.md`.
- **Classification:** `Small` / `Low`, direct route. Review gates `N/A — not applicable`; test-code review `Not Required`.
- **Revisions:** SR-002 / API-REV-001 / DR-001.

## What Changed

- **`list_projects` (native and MCP):** returns each Project's linked folders as `workspaces: [{workspaceRootPath, description}]`. A Project without folders has no `workspaces` field, and a link without a description has none.
- **The tool's description:** names `workspaces` and its purpose, so an agent can find which Project a folder belongs to.
- **`create_project` and `update_project`:** their results use the same shared projection, with their shape unchanged.
- **Docs:** `projects.md`, `agent_tools_mcp_server.md`.

## Integration

- `Already current` with `origin/personal` `1964ce9874`; API/E2E ran on the final software content.

## Verification From Evidence

- Every AC (AC-001..005) is proven; 96.0% overall.
- Opened:
  - `API-03`: `Tests  18 passed (18)`, including `✓ … E-006 …` over the real MCP HTTP host. The negative control with the base `project-service.ts` fails E-006 (`1 failed`), so the new assertions are not vacuous.
  - `API-04`: `production errors: 0; test-file errors: 1184 in 366 files (baseline …)`, `[typecheck] PASS`.
  - `API-05`: a live AutoByteus agent on LM Studio `qwen3.6` called `list_projects` and answered `project_592d0782…`, which is "Shop", the right Project, with `errors: []`. Billing, which has no folders, was listed without a `workspaces` field.
- No user check was needed.

## Residual Risks

- Claude and Codex agents were not run live (paid); the MCP transport they use is proven by API-03.
- The agent-use scenario rests on one model and one run.
