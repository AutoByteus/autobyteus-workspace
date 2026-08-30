# Full-Product Software Engineering Team Reproduction

## Result

`Reproduced` on 2026-08-27 through the real AutoByteus frontend, the running Electron backend, a real Software Engineering Team, and Codex App Server 0.150.1.

Both requested AgentTeam tools worked before stop and failed after stop/config-update/restore with the exact reported error:

```text
HTTP 404: {"error":"session_unavailable","message":"Agent tool MCP session is unavailable."}
```

## Environment

- Frontend: current task-worktree Nuxt frontend at `http://127.0.0.1:3001`
- Backend: running Electron server at `http://127.0.0.1:29695`
- Browser automation: AutoByteus `open_tab` plus DOM/browser tools
- Team definition: `Software Engineering Team`
- Team run: `software_engineering_team_135c068d8c924e35bbb11f1a501e6179`
- Coordinator/member: `/solution_designer`
- Runtime: `codex_app_server`
- Model: `gpt-5.6-luna`
- Initial fast-mode/service-tier setting: `Default`
- Updated fast-mode/service-tier setting: `fast`
- Workspace: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`
- Auto-approve tools: disabled; each requested tool call was explicitly approved in the frontend

The workspace already had other active Codex runs. Server diagnostics showed multiple routed Codex threads in the cwd-shared app-server process, preserving the product-reachable condition where stopping this team does not terminate that process.

## Exact Reproduction

1. Opened `Agent Teams` in the frontend and selected `Software Engineering Team`.
2. Selected `Codex App Server`, `GPT-5.6-Luna`, fast mode `Default`, and the existing `autobyteus-workspace-superrepo` workspace.
3. Launched the team and sent:

   ```text
   Reproduction step 1 only: call get_handoff_rules, then use send_message_to to send /architecture_reviewer exactly 'pre-stop tool check'. After both tool calls, report whether they succeeded and do nothing else.
   ```

4. Explicitly approved both tool calls. The coordinator reported:

   ```text
   Both succeeded:

   get_handoff_rules: succeeded.
   send_message_to: delivered successfully.
   ```

   The Team panel contained one accepted message to `/architecture_reviewer`: `pre-stop tool check`.

5. Clicked the target team row's `Terminate team` control. The row changed from `Active team run` to `Inactive team run`, and the coordinator changed to `Offline`.
6. Opened `Edit Config` for the stopped team, changed the global fast-mode/service-tier selector from `Default` to `fast`, and clicked `Save`.
7. The frontend confirmed: `Team model settings updated. They will be used when this team resumes.` The persisted execution tree subsequently contained `llmConfig.service_tier: "fast"` for the root and members.
8. Returned to the event view and sent:

   ```text
   Reproduction step 2 only: first call get_handoff_rules, then use send_message_to to send /architecture_reviewer exactly 'post-resume tool check'. Report the exact result or error from each tool call and do nothing else.
   ```

9. The inactive team restored automatically and the coordinator changed to `Running`.
10. Explicitly approved both post-restore tool calls. Both failed:

    ```text
    get_handoff_rules: tool call error ... unexpected server response:
    HTTP 404: {"error":"session_unavailable","message":"Agent tool MCP session is unavailable."}

    send_message_to: tool call error ... unexpected server response:
    HTTP 404: {"error":"session_unavailable","message":"Agent tool MCP session is unavailable."}
    ```

11. The Team panel still contained only the pre-stop message; no post-restore message was delivered.

## Corroborating Server Evidence

The Electron server log recorded two POST requests to the same old opaque `/mcp/agent-tools/<redacted>` endpoint after restore, both returning HTTP 404. This matches the direct Codex probe: the surviving app-server process retained the stopped thread's old MCP client instead of using the fresh descriptor supplied by AutoByteus on restore.

The persisted team execution tree confirmed:

- the same AutoByteus team/member run identities were retained;
- the same persisted Codex provider thread ID was retained for `/solution_designer`;
- model `gpt-5.6-luna` was retained;
- `service_tier: "fast"` was applied after the stopped-team settings update;
- the failure therefore occurred after a valid restore with the updated runtime setting.

## Cleanup

- Terminated the reproduced Software Engineering Team again; its row returned to `Inactive team run`.
- Closed the browser tab.
- Stopped the task-owned Nuxt development frontend.
- Did not stop or modify the user's Electron backend or unrelated active runs.

## Visual Evidence

See `full-product-software-team-session-unavailable.png` in this directory. It captures both post-restore tool errors and the Team panel showing only the successful pre-stop message.
