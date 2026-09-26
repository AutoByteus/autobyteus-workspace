# API-REV-004 live Chrome observation (2026-09-26, Europe/Berlin)

## Environment and ownership
- Built server from assigned integrated worktree `ee0e2c313` via installed TypeScript compiler plus asset copy. Built missing shared SDK TypeScript outputs. Nuxt dev from the same worktree.
- Backend: `http://127.0.0.1:18080`, owned PID 91915 at recording; GraphQL POST `query { __typename }` returned HTTP 200. Process environment explicitly `APP_ENV=test`, `DATABASE_URL=file:/tmp/agy-browser-api-rev-004-zw14bL/db/test.db`, `AUTOBYTEUS_SERVER_HOST=http://127.0.0.1:18080`, isolated app-data `/tmp/agy-browser-api-rev-004-zw14bL`.
- Frontend: `http://127.0.0.1:13080`, owned PID 91877 at recording; `/workspace` HTTP 200. Nuxt backend HTTP proxy and WebSocket endpoint target 18080. Existing unrelated localhost:3000 was not stopped or used.
- Chrome agent-created tab at `http://127.0.0.1:13080/workspace` was marked deliverable, left displaying the completed native image run. It is a live tab, not a static screenshot. CUA accessibility tree, DOM snapshot and screenshot were observed; screenshots are in the tool transcript, not persisted as image files.
- First backend start used inherited production `APP_ENV`/`DATABASE_URL` instead of isolated `.env`, failed on locked database before readiness. It was not used for UI tests. `backend.log` and `setup-checkpoints.md` preserve the failure; the corrected successful process used only test.db (`backend-isolated.log`). No production-data mutation is claimed or inferred.

## Package import through actual UI
1. Settings → Agent Packages initially showed only Built-in Storage with two agents.
2. Entered the selected local package path `/Users/normy/autobyteus-org/autobyteus-task-worktrees/agy-codex-skill-bundle-20260926` and clicked **Import Package**.
3. UI showed **Agent package imported.** New package row: 8 shared agents, 44 team-local agents, 12 teams, local path. Featured **Codex** appeared with `software-engineering-workflow-skill`.

## Real browser native-image journey (API-CASE-004)
1. Clicked Codex **Run**, selected **Antigravity CLI** and **Gemini 3.8 Flash (Low)**, default isolated Temp Workspace, then **Run Agent**. In the new browser chat sent: “In this isolated validation workspace, use your own native generate_image tool to make a small simple blue dog illustration. After the tool finishes, tell me briefly what you did. Do not modify source files or contact anyone.”
2. Run ID `codex_15a770dc22854bb4abeb43f2046ccbc2`; Chrome UI displayed one green `generate_image` conversation card and ordinary assistant reply; status **Idle**. Clicking the card opened Activity with **1 Events**, `generate_image`, **SUCCESS**. Expanded Result displayed `{ "provider_state": "DONE", "output": null }`. No `call_mcp_tool` image card was displayed. The frontend did not display an image preview or app-hosted file, which is not required by E-055; the assistant's “saved as an artifact” sentence is model prose, not proof of app-accessible bytes/path.
3. `real-run-trace-summary.json` is a bounded selection from actual backend raw traces: seq 2 `TOOL_EXECUTION_STARTED` and seq 3 `TOOL_EXECUTION_SUCCEEDED` are both `tool_name=generate_image`, same nonempty `tool_call_id=agy-tool-df757e73-b3ef-49cf-9e2d-c64fa910857a-2` and turn ID, followed by seq 4 assistant. No MCP image call.
4. `real-run-projection.json` verifies new-run AGY custom-agent frontmatter has exactly `tools: [view_file, write_to_file, replace_file_content, grep_search, list_dir, find_by_name, run_command, generate_image]`, excluding native collaboration and `call_mcp_tool`. Materialized workflow skill bytes equal the selected imported package skill bytes.

## Fresh first-turn skill journey (API-CASE-006)
1. Used browser **New run with this agent**, retained AGY/Gemini model, and sent: “For this fresh Codex run, read your bundled software-engineering-workflow-skill and tell me the first workflow stage and its immediate objective. This is only a validation question; do not create or edit files or contact anyone.”
2. Run ID `codex_d99775c7702b4caf9fc30854759d74e6`; browser showed four green `view_file` tool cards/Activity SUCCESS events, then an ordinary reply identifying **Stage 0: Bootstrap + Draft Requirement** and the immediate objective to bootstrap work context and stage-gate controls before investigation. Status **Idle**. `real-skill-first-turn.json` records same selected-package skill SHA-256 as the image run and four native view_file STARTED/SUCCEEDED pairs, followed by assistant.
3. Returned the browser tab to the image run and expanded its SUCCESS result for user inspection.

## Scope, limits, and cleanup
- This is an actual separately running backend/frontend/Chrome/installed-AGY 1.2.11 journey, not a mocked component test or synthetic CLI. Browser actions were through the product UI, not a GraphQL substitute. Current package import and both real runs passed their intended paths.
- Prior Team/Org MCP, failure redaction, warn/skip and safety evidence is carried from API-REV-002; those cases were not repeated in the browser. No product source or durable test changed in API-REV-004. Electron shell was not launched.
- The user asked to start the services, so owned backend/frontend processes, isolated test data and marked browser result tab are intentionally retained for inspection. Before eventual cleanup, verify the processes still listen on 18080/13080 and are the recorded worktree commands; then stop only those PIDs/sessions and remove only the exact isolated app-data path above. Do not stop localhost:3000, desktop AutoByteus or any production database. This retained state is deliberate, not a leaked test process.
