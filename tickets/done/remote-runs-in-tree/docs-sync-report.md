# Docs Sync Report — autobyteus-278 (Remote delegated runs in the run tree)

- Ticket: `remote-runs-in-tree` (autobyteus-278). `Large` / `High`, reviewed route.
- Integrated base: `origin/personal` `27f2d2f72d` (task-agent-several-tasks, `1.5.9-beta.2`), merge `444dfc7ec2`.
- `collaboration_model.md` changed on both sides and merged into a coherent whole: the base's CM-6 several-Tasks wording sits beside this ticket's CM-11 and remote-tree text.

| Doc Path | Result | Notes |
| --- | --- | --- |
| `autobyteus-server-ts/docs/design/collaboration_model.md` (§ 3/4/5) | No change | Remote links in the root's own `remoteTaskExecutions`; the owner stops a remote run only through the link; remote runs listed under their delegator. |
| `autobyteus-server-ts/docs/modules/remote_collaboration.md` § Remote runs in the run tree | No change | The four routes exist (`api/rest/remote.ts`: run-summaries, agent-projection, owner-commands, the run-observations WebSocket); `RemoteRunViewProvider`, `remoteOwnerUserMessage` and `onHostReady` exist. The heading matches RC-31 and the screenshot; `REMOTE_TARGET_NOT_PERMITTED` matches RC-35. |
| `autobyteus-web/docs/agent_execution_architecture.md` (Remote Delegated Runs) | No change | `readRemoteTeamMember` (a Team opens a remote member first), the one view owner and the Retry rule match RTP-04/06/07. |

- Docs updated by delivery: none. The implementation's docs were verified.
- Note: `autobyteus-web/generated/graphql.ts` was edited by hand for `remoteTaskExecutions`. A later codegen reproduces it (implementation handoff); the web suite and typecheck pass on it.
