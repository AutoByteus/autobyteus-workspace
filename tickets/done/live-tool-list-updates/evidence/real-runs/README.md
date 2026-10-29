# Real runs (autobyteus-324)

Gated e2e `autobyteus-server-ts/tests/e2e/runtime/live-tool-list-updates.e2e.test.ts` through the real Studio
server on a temp AutoByteus data root (deleted after each run). Turn script: call alpha (`list_projects`);
add beta (`list_project_tasks`); call beta and quote turn 1's codeword; remove alpha; try alpha.
Command: `env -i PATH HOME=<see below> USER LOGNAME TMPDIR RUN_LIVE_TOOL_LIST_E2E=1 LIVE_TOOL_LIST_RUNTIME=<kind>
LIVE_TOOL_LIST_MODEL=<model> LIVE_TOOL_LIST_EVIDENCE_DIR=<this folder> npx vitest run <file>`; date 2026-10-29.
`summarize.py <json>` prints a turn summary.

| Runtime | Model | HOME | Result | File |
| --- | --- | --- | --- | --- |
| autobyteus (native) | qwen/qwen3.6-35b-a3b via LM Studio | temp | Pass. Notice "Now available: list_project_tasks" with turn 2; beta worked; codeword quoted; notice "No longer available: list_projects" with turn 3 (the model did not try alpha); seen record written. The JIT-loaded model was unloaded after the run | live-tool-list-autobyteus.json |
| claude_agent_sdk | haiku | real (CLI sign-in) | Pass. Beta worked in the same session; after removal Claude itself answered "No such tool available: mcp__autobyteus_agent_tools__list_projects" (it re-listed over the held GET stream) | live-tool-list-claude_agent_sdk.json |
| antigravity_cli 1.4.10 | gemini-3.8-flash-low | real (host login; TESTING.md known gap: the run's conversation is in the user's agy history) | Pass. No transport header; beta worked in the same session; the server refused the removed tool ("Tool is not enabled for this session") | live-tool-list-antigravity_cli.json |
| grok_build 1.0.70 | grok-4.7 | real | Not proven: turn 1 (before any tool change) stalled after `search_tool` found the tool; the user confirmed the Grok account had run out of credit. To re-run when credit is back | live-tool-list-grok_build.json |
| codex_app_server 0.165.0 | — | — | Not run: no Codex credit (DEC-004 allows the build without it). The no-model check of `enabled_tools: []` is in ../step1 | — |
