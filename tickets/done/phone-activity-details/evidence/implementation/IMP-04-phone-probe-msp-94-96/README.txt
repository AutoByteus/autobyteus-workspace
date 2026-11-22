# IMP-04 the phone Activity's rows and details on the production phone bundle (MSP-94, MSP-95, MSP-96)
# command: pnpm -C autobyteus-server-ts build ; pnpm -C autobyteus-web build:mobile-web ;
#          cd autobyteus-web && node tests/e2e/mobile-shell-probe.mjs --cases=MSP-94,MSP-95,MSP-96 --output-dir=<this folder>
# commit: working tree = 597f2dc6d6 (run before committing; same files)
# env: macOS, Node v22.23.1, Chrome headless (390x844, touch), scripted AGY CLI, loopback
# date: 2026-11-22
# result: Pass (summary: MSP-94, MSP-95, MSP-96 Pass; unknownBrowserErrors 0; servers stopped, temp root removed)
#
# MSP-94 (a node whose scripted AGY streams one turn of real AGY 1.2.14 tool steps, AGY_FAKE_CASE=mcp_calls):
#   13 rows (MSP-94-activity-rows.png). view_file: "autobyteus_agent_tools/delegate_task.json" (its AbsolutePath, full
#   path in the title); delegate_task: "→ /researcher"; open_tab: "about:blank"; echo_args, json_result, list_tabs and
#   call_mcp_tool: their name once, no summary line; every success its check icon only (aria-label "Success"); the two
#   failures "Failed" with icon and their error excerpts; every row >= 44 px. Scrolled to the end (scrollTop 70 of 866),
#   a row opened and Back: scrollTop 70. The failed call's details: "Failed", Arguments {"reason": "probe"}, Result, and
#   its Error in full, open (MSP-94-failed-details.png), nothing wider than the screen; json_result's Result holds
#   JSON-MARKER-4471. A Chinese phone: 状态, 参数, 结果, 错误 (MSP-94-zh-CN-*.png; the status word stays the desktop's English).
#   A call to another MCP server is named mcp__<server>__<tool> by the node, as on the desktop.
# MSP-95 (AGY_FAKE_CASE=auto_compaction, the second turn compacts): the "Memory compaction" row opens its details:
#   Completed, its message, and its rows Turn, Provider, Boundary, Source (MSP-95-compaction-details.png).
# MSP-96 (alpha, the probe's paired phone): a background task whose command is long: its title (the command, as AGY's
#   tasks have) is clamped to two lines, a tap unfolds it in full (aria-expanded true; MSP-96-background-task*.png); its
#   run_command row's summary is the command (AGY's CommandLine). HOLD_TURN leaves a run_command running; its details
#   say Running; the run is terminated while they are open and they change by themselves to the interrupted state with
#   its Error "interrupted" (MSP-96-running-details-after-stop.png; the desktop's word for that status is "Unknown", FU-004).
# Not shown here: a Logs section and its growth while open. The scripted AGY CLI streams no tool logs (only the Codex and
#   native runtimes send TOOL_LOG); MobileActivityDetail.spec covers it (IMP-03).
