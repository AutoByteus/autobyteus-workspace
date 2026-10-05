# FAPI-013 — IR-015 override does not disable Codex multi-agent v2 (AC-017 fails)

Observed 2026-10-05 on `335f78c20` (IR-015), freshly built packaged app, owned isolated instance `iso-54775-990c`, driven through the UI like a user. Codex App Server, GPT-6-Luna (reasoning medium), codex-cli 0.160.0. The user's own `~/.codex/config.toml` has `multi_agent = false`.

## Expected (AC-017)
A Codex-backed delegated copy does not expose Codex's built-in multi-agent tools (`send_message` / `list_agents` / `spawn_agent`) and replies through AutoByteus `send_message_to`.

## Observed
- AutoByteus's Codex process **is** launched with the override: `codex app-server -c features.multi_agent=false -c features.multi_agent_v2=false` (pid 46986, child of the instance's embedded server; see `codex-app-server-processes.txt`).
- Every AutoByteus Codex thread in the run still receives Codex's multi-agent v2 setup: `turn_context.multi_agent_version = "v2"` and a developer prompt beginning `<multi_agent_role>You are /root, the primary agent in a team of agents… use spawn_agent, send_message, followup_task, list_agents…`. This covers the Manager (`01a10cdc…`), the Task A team coordinator (`01a10cdd-1ef2…`), the Task B worker (`01a10cdd-1e10…`) and the Task C team coordinator (`01a10ce4…`). Summaries are in `codex-sessions/*.summary.json`.
- **Task B worker** (`ui_report_worker_04803d…`, thread `01a10cdd-1e10…`, originator `autobyteus-server-ts`) called the built-in `send_message(target:"/project_task_manager")`, rejected with "absolute agent paths must start with `/root`", then `send_message(target:"/root/project_task_manager")`, rejected with "live agent path not found". Its report never reached the Manager. This is the user's original symptom.
- The two Team coordinators happened to choose AutoByteus `send_message_to`, and their reports reached the Manager (seen in the Manager chat UI). So results are still nondeterministic.
- `codex -c features.multi_agent=false -c features.multi_agent_v2=false features list` reports both as `false`. The feature flags therefore are not what enables the multi-agent v2 thread setup here. The thread-level `multi_agent_version` comes from somewhere else (possibly model or catalog driven for GPT-6 models, or another config key).

## Side observation
AutoByteus's Codex also launches MCP servers from the user's `~/.codex/config.toml` (here Codex.app's `cua-repl` / `node_repl`), which in turn started its own `codex app-server --listen stdio://` without the flags (pid 51357). It is not shown to serve AutoByteus threads, but user-level MCP servers leak into AutoByteus Codex runs.

## Preliminary classification
**Implementation / Local Fix (IR-015 mechanism ineffective)**: the chosen control does not govern the behavior. Possibly Design Impact if Codex offers no supported switch. Recommended next owner: Code Reviewer for focused failure-origin review; the fix needs the real control for `multi_agent_version` (or a thread/start parameter).
