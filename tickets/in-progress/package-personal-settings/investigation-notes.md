# Investigation Notes

## Investigation Meta

- Package identifier: `package-personal-settings`
- Request: Project Task autobyteus-95, "Personal settings vs. package files for agents, teams and orgs"; delegated by `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), 2026-10-24
- Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/package-personal-settings`, branch `codex/package-personal-settings`
- Base: `origin/personal` `c78ffb15a2` (fetched 2026-10-24). Finalization target: `origin/personal`.
- Bootstrap: worktree created; ticket folder `tickets/in-progress/package-personal-settings/`. No blocker.
- Current solution revision: `SR-001`
- Authorities read (2026-10-24): `references/requirements-engineering.md`, `references/ticket-scope.md`, `references/finding-the-cause.md` (read in this conversation); the updated `SKILL.md`.
- How established: `Read` (code/docs) unless marked `Measured`.

## Request

- The Task description: four items (avatar personal; personal runtime/model overrides; clean package writes, including FT-5/O-2; meaning of editing GitHub-installed packages). One coherent model of package content vs personal settings. The user decides the real product choices.
- Attachments:
  - `follow-up-task-request.md` (imported-team-defaults-edit, 2026-10-14);
  - `follow-up-ticket-requests.md` (FT-5/O-2: the first save of an older package drops `refType`, reorders `avatarUrl` in `org-config.json`, drops `team.md`'s trailing newline).
- The user's direction, 2026-10-24, which raises the priority:
  - updates of a GitHub agent package, by click or automatic, must not lose the user's personal changes;
  - he mostly ADDS tools or MCP choices in `agent-config.json` or the team config (for example, on his Docker machine he installs an MCP server and enables it on an agent);
  - everything else may be overwritten.
  - Compare (A) a personal overlay in the app and (B) a 3-way merge at update time.
  - Never lose data silently (a backup at minimum); any change to stored user data needs his approval.
- The Project Task Manager, 2026-10-24: stage the work so the tools-survive-updates case comes first; ask the user directly for product choices.

## Source Log And Findings

| ID | Source | Finding | How |
| --- | --- | --- | --- |
| F-01 | `autobyteus-server-ts/docs/modules/mcp_server_management.md:18-21` | An agent enables a registered MCP server's tools by listing the tool names in the same `agent-config.json` `toolNames` as local tools. The user's "enable an MCP server on an agent" is therefore an edit of `toolNames` inside the package folder | Read |
| F-02 | `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/agent-config.json` | A real package agent config: `toolNames`, `skillNames`, `skillScope`, five empty processor lists, `avatarUrl` (an app-local `/rest/files/images/<uuid>.png`), `defaultLaunchConfig: null` | Read |
| F-03 | `autobyteus-server-ts/src/agent-definition/providers/agent-definition-config.ts:54-79` | A save writes every field from the in-memory definition (`buildAgentConfigRecord`), including empty lists and `null`s, over the existing file (`mergeAgentConfigRecord` keeps unknown keys). This is the cause of item 3's noise | Read |
| F-04 | `autobyteus-server-ts/src/agent-packages/installers/github-agent-package-installer.ts:105-184` | A package update moves the installed folder to `<staging>/previous-install`, renames the new archive's folder into place, and on commit deletes the staging folder, previous install included (`cleanup`, lines 148-166). The whole folder is replaced: an edited `agent-config.json` or team config is overwritten, and no backup survives | Read |
| F-05 | 209 design (no confirmation for a package's manual Update, the user's decision); `autobyteus-web/localization/messages/en/updateNotifications.ts:55, 73-74` | Manual package Update: no warning. Turning automatic updates on: a one-time confirmation "Local changes and files you added in a package are replaced without asking and cannot be restored." | Read |
| F-06 | F-04, F-05 | **Answer to the user's question:** today nothing detects or keeps personal edits. After every update, by click or automatic, added tools and MCP choices are gone, and the user has to re-add them | Read |
| F-07 | `autobyteus-server-ts/docs/modules/agent_team_definition.md:9-27, 138-170`; `src/agent-team-definition/providers/agent-team-definition-config.ts:115-153` | Team config: coordinator, members, handoffs, `avatarUrl`, `defaultLaunchConfig`. Member tools live in the member agents' `agent-config.json` | Read |
| F-08 | `tickets/done/imported-team-defaults-edit/solution-revision-record.md` (SR-001, SR-003) | An app-data personal launch-preference store (`AgentLaunchPreferenceStore`, keys `agent:` / `agent_team:` / `agent_org:`) was designed and reviewed, then withdrawn. On 2026-10-14 the user said tools, skills and the tested runtime/model belong in the package and the avatar is personal | Read |
| F-09 | `src/launch-preferences/default-launch-config.ts` | Only the normalizer of `defaultLaunchConfig` exists; no personal store | Read |
| F-10 | F-02 | A package's `avatarUrl` points to an image file in the app data of the machine that saved it; on other machines it shows nothing (the user's point in item 1) | Read |

## Requirement Implications

- The tools case needs either a personal place for tool additions that updates never touch (A), or a merge at update time that keeps them (B).
- Both need the previously installed revision's files to know what the user changed: (A) only once, to carry over edits made before this change; (B) at every update. `codeload` serves any revision by SHA without API quota (209/210 evidence).
- A backup of every overwritten file that differs from the installed revision is the minimum safety either way.

## Product Design Request Context

- Not requested yet. The changes visible to the user (which edits are personal, the notes at the editor, the update confirmation text) may need a Product design step once the model is chosen.

## Architecture Investigation Findings

Not started.
