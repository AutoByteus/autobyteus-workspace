# Handoff Summary — agent-tool-results-omit-empty (autobyteus-260)

`task_size` Large · `architectural_risk` High · reviewed route (architecture review, code review, API/E2E, test-code review).

## What Shipped

- **One tool result rule.** Every platform agent tool result, on the native and MCP routes, leaves out empty fields (`null`, `""`, `[]`, `{}`) and is compact JSON. One owner does this: `toToolResultJson` and `toAgentToolsMcpStructuredJsonResult`. `tests/architecture/agent-tool-result-boundaries.test.ts` enforces it. `list_available_agent_runtimes` (autobyteus-303, merged meanwhile) was brought under the rule in DR-001.
- **Project Task titles.** A required `title` is set by `create_task` / `update_task` and the app's Title field. It is shown on cards, pickers, the Task page, the Workspaces tree and in tool results. At startup, migration `project-task-titles` (after `projects-per-folder-v1`) titles existing Tasks from their description's first line.
- **Short lists and one Task in full.** `list_project_tasks` returns short entries, with `projectId` once. `search_project_tasks` returns `title`, and `meaningSearch` only when meaning search was not fully used. `get_project_task` (opt-in) reads one Task in full; a worker can read only its own Task, and its first message names the Task and Project. Context files are `{name, path}`.
- **Project Task Manager package** (`autobyteus-agents`, REQ-012): the skill and tool list match.

## Measured Sizes (REQ-010, AC-008), for the user

| Result | Before | After | Change |
| --- | --- | --- | --- |
| `list_project_tasks`, AutoByteus Project, 153 open Tasks (user data) | 481,648 B | ≈31,126 B | ≈ −94% |
| `list_project_tasks`, all 300 Tasks (user data) | 1,287,231 B | ≈59,528 B | ≈ −95% |
| `list_project_tasks`, 155 synthesized open Tasks (this build's real output) | 386,253 B | 33,002 B | −91.5% (QR-001 ≤ 10%: 8.5%, met) |
| One Task in full (`get_project_task`, 202-byte title) | 3,714 B | 3,861 B | +4.0% (the title) |
| `update_task` acknowledgement | 140 B | 324 B | +131% (now carries the title, REQ-009) |
| `send_message_to` refusal | 144 B | 117 B | −18.8% |
| Browser `dom_snapshot`, 200 elements | 60,542 B | 36,334 B | −40.0% |

Source: `evidence/API-13-before-after-sizes-table.md`.

## Integration And Verification

- Integration: checkpoint commits `269dbc209f` and `1bb590bdae`. Merge `54cd6803f4` (`origin/personal@63a36d00d8`) gave DR-001 (blocked; fixed in `7c60cb4909`, CRR-006, API-REV-003). Merge `3531463a04` (`origin/personal@84dc0b2156`, autobyteus-273 and beta.8) was clean.
- Post-integration check: `evidence/DEL-02-integrated-server-typecheck-and-unit.log`. Results are in `release-deployment-report.md`.
- Verified from the evidence. Every critical AC is directly proven at 95% final confidence; the per-AC record is in `release-deployment-report.md`. No user check is needed.

## Known Limits And Follow-ups

- Rolling back after the titles migration is not supported: an older build drops the title when it saves a Task.
- FU-001 to FU-008 are in `follow-ups.md`. FU-008 (an architecture test already failing on `personal`) is urgent. The Solution Designer sends them.
