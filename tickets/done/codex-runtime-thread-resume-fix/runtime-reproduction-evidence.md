# Runtime Reproduction Evidence

## Status And Purpose

- Status: Complete
- Approval applicability: N/A — this is retained investigation evidence, not an intended-behavior authority.
- Purpose: Record the live browser reproduction of the Codex team-member restart regression and the provider-thread identities observed on both sides of the process boundary.
- Related behavior and acceptance-criteria IDs: BEH-001, BEH-002; AC-001, AC-002, AC-003, AC-007.

## Isolation And Setup

- Branch: `codex/codex-runtime-thread-resume-fix`
- Base commit: `2b0f8ea99296bb3f983c497d1f5c00a4d839f404` from `origin/codex/agent-team-universal-task-delegation`
- Disposable server data: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/autobyteus-server-ts/tests/.tmp/codex-resume-investigation-20260817-1`
- Disposable SQLite database: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/autobyteus-server-ts/db/codex-resume-investigation-20260817-1.db`
- API server: `127.0.0.1:60417`
- Web development server: `127.0.0.1:31317`
- Agent package: `/Users/normy/autobyteus_org/autobyteus-agents`
- Team: `classroom-simulation-team`
- Professor and student runtime/model: `codex_app_server` / `gpt-5.6-luna`
- Browser driver: AutoByteus Browser Tools `open_tab`, `navigate_to`, `run_script`, and `screenshot` against the real web UI.

Before starting the server, Prisma migrations and the requested credential import were run only against the disposable database. `lsof` confirmed that the server PID had the disposable database open and did not have `/Users/normy/.autobyteus/server-data/db/production.db` open. Both owned listeners were stopped after the reproduction.

## Reproduction

1. Created root TeamRun `classroom_simulation_team_6ae0a589b65246af8c39b4faca92cfcc`; its professor AgentRun was `professor_6ae1faec0bc64239bb81d85caa39a5ad`.
2. Opened the run in the live browser UI and sent:

   `This is a continuity check. Do not delegate and do not use tools. Remember this exact marker: COBALT-RIVER-9173. Reply only: I will remember COBALT-RIVER-9173.`

3. The professor replied correctly: `I will remember COBALT-RIVER-9173.`
4. Captured the persisted execution tree and provider session metadata.
5. Stopped the API server completely, verified the listener closed, and restarted the server with the same disposable data directory and database.
6. Reloaded the web UI, reopened the same TeamRun, and verified that both earlier messages were visible.
7. Sent through the live browser UI:

   `What was the exact marker from my previous message? Reply with only the marker.`

8. The professor replied incorrectly: `codex-runtime-thread-resume-fix`.

## Provider-Identity Result

| Phase | Codex provider thread ID | Persisted professor `platform_agent_run_id` | Observable result |
| --- | --- | --- | --- |
| Before server restart | `01a0104a-2dd9-7bd2-92f9-70a704a4dbf5` | `null` | Correct acknowledgement of `COBALT-RIVER-9173` |
| After server restart | `01a0104c-1a48-7af2-a8bc-d9cb94e4ed12` | `null` | Incorrect inferred answer `codex-runtime-thread-resume-fix` |

The two Codex session IDs are different. The server log records `Successfully created codex_app_server agent run 'professor_6ae1faec0bc64239bb81d85caa39a5ad'.` before and again after restart; it does not record a restored Codex AgentRun. The local AgentRun ID remained stable while its provider thread changed.

## Confirmed Interpretation

- The user's report is reproduced.
- Local history restoration is working: the browser displayed the earlier user and assistant messages after restart.
- Provider continuation is not working: the authoritative TeamRun execution tree retained a `null` platform binding, and the first post-restart turn created a second Codex thread.
- The post-restart answer was not merely a rendering problem. The second provider thread lacked the marker and inferred a value from its fresh context.

## Retained Evidence Files

- `run.json`: launch input, TeamRun ID, professor AgentRun ID, and initial tree.
- `pre-restart-api.json`: local-history and execution-tree projection after the first turn.
- `pre-restart-persisted-tree.json`: physical tree after the first completed turn.
- `pre-restart-codex-sessions.json`: first provider thread metadata only.
- `pre-restart-browser.png`: browser UI after the first response.
- `post-restart-api.json`: local-history and execution-tree projection after the follow-up.
- `post-restart-persisted-tree.json`: physical tree after the follow-up.
- `post-restart-codex-sessions.json`: both provider thread metadata records.
- `post-restart-browser.png`: browser UI showing restored history and the wrong follow-up answer.
- `server.log`: value-free server lifecycle and AgentRun creation evidence.

No raw credential values are retained in this evidence folder.
