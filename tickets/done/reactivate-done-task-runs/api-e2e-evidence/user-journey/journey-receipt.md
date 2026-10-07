# USER-JOURNEY receipt: real user in an isolated desktop instance with real models

- Date: 2026-10-07
- Build: `autobyteus-web/electron-dist/mac-arm64/AutoByteus.app`, built from worktree commit `3394e7078` by `pnpm -C autobyteus-web build:electron:mac` (exit 0)
- Instance: `pnpm isolated-app start --from-worktree` → `iso-52015-541c`
  - control port 52015, backend port 52016
  - private data root `…/autobyteus-isolated-root-YXz5aB` (see `iso-start.json`)
- Control: attach-only CDP to the instance's control port (`ui-cdp-helper.mjs`, playwright-core `connectOverCDP`; it never closes the app)
  - The browser-automation launcher named in TESTING.md is not present on this machine (`autobyteus_mcps/browser-automation` has no `scripts/`).
- Model: Claude Agent SDK runtime, `claude-opus-5-5` (the recommended choice in the model picker), through the machine's logged-in Claude CLI. No keys were imported.
- Test agent package (imported through Settings → Agent Packages → local path): `test-agent-package/`
  - Release Manager: Task and delegation tools;
  - Release Notes Writer;
  - Docs Review Team (docs_reviewer as coordinator, docs_editor).

  The Manager's instructions say to continue with the same worker for more work, but **not how**. The how comes only from the product's tool descriptions.
- Every action was a user action in the UI: Run the Manager, choose the model, type in the composer, click rows, and use `isolated-app restart` for the app restarts.
- The agents decided every tool call themselves.

## Journey and observations

| # | User action | Agent behaviour (from the Manager's visible tool calls and replies) | Product observation | Evidence |
| --- | --- | --- | --- | --- |
| 1 | Asks for release notes; gives code name BLUE HERON and version 4.2 | `list_available_agents`, then `delegate_task` (described) → ad hoc Task `ad_hoc_task_280a…`; the writer replies via `send_message_to` | Writer copy `release_notes_writer_75ec…` | `manager-conversation.txt` |
| 2 | "Good. Also have the Docs Review Team review…" | Took "Good" as acceptance: `create_or_update_task(DONE)` on the writer's Task, then `delegate_task` to the team (ad hoc Task `ad_hoc_task_e1f7…`) | The writer row left the tree; the Team row and its 2 members are listed (`02-before-done-tree.png`). Stored: writer entry `closedAt` set | shots 02 |
| 3 | Accepts the review | `create_or_update_task(DONE)`. It told the user: "If you need more changes… I can restart the same worker and it will still have its earlier context" (REQ-011: learned from the tool texts) | Both `task.json` DONE; no task rows | shots 03 |
| 4 | "Please get the same writer to update its draft — it already knows the version and code name, so only send it the new details." | `create_or_update_task` (DONE → **IN_PROGRESS**), then `send_message_to(target_agent_run_id=release_notes_writer_75ec…)`. Relayed the tool result: "delivered… and the writer's copy was reactivated" | The writer row reappeared live, without reload, ~5 s after send. The same run ID; its conversation shows round 1, then the new message (new details only), then the updated draft. It uses 4.2 and keeps BLUE HERON out, from memory | shots 04, 05 |
| 5 | "Ask the same team to check whether option A still fits… They know the sentence already." | `create_or_update_task` (DONE → IN_PROGRESS), then `send_message_to(target_agent_run_id=docs_reviewer_1f61…)` (the coordinator). "the team's copy was reactivated" | The Team row and the same members (`docs_reviewer_1f61…`, `docs_editor_6c45…`) reappeared live ~10 s after send. The stored tree still has 5 nodes (no new copy). The reviewer referred to the original sentence and option A from memory | shots 06 |
| 6 | Accepts both | `create_or_update_task(DONE)` ×2 | Both DONE; all task rows gone (AC-010) | shots 07 |
| 7 | **App restart** (`isolated-app restart`) | — | Run listed; Manager conversation intact; no task rows (closed stay hidden) | shots 08, `iso-restart1.json` |
| 8 | "One last change… the first bullet should start with 'New:'. Please have the same writer do it." | `create_or_update_task` (DONE → IN_PROGRESS), then `send_message_to(writer run ID)`: "reactivated" (AC-011, restart path) | The writer row reappeared live ~10 s after send. The writer got only the change request (not the draft) and returned the full accepted draft with "New:", rebuilt from its restored conversation | shots 09, 10 |
| 9 | **Second app restart** | — | The reactivated writer row is still listed; the closed Team copy stays hidden (AC-004 after restart) | shots 11, `iso-restart2.json` |

Final stored state (`final-state/`):
- writer Task `IN_PROGRESS`, its entry `closedAt: null`;
- review Task `DONE`, entry closed.

Task status was written only by the agent's own `create_or_update_task` calls.

## Cleanup

`isolated-app stop iso-52015-541c` reported:
- `wasRunning: true`, `forced: false`;
- `dataRootRemoved: true`;
- control and server ports released.

`isolated-app list` shows no instances. The user's installed AutoByteus app and `~/.autobyteus` were never touched.

## Not covered by this journey

- Agent Team and Agent Org **roots** in the real app; the Manager here was a standalone Agent root. The browser probe BR-009/010 and the server E2E cover those roots.
- A Project Task (Projects are off by default per node); the server E2E and the probe cover Project Tasks.
- The "message while still DONE" refusal by a real model. The agent never chose to send before reopening; the scripted layers prove the refusal.
