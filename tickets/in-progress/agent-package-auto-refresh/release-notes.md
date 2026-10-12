# Release Notes — Agent Packages Refresh Automatically

Status: prepared before user verification. Whether this ships in a release, and with which version, is decided at finalization.

## New
- **Agent, team and org changes appear without Reload.** When a definition file in an agent package folder is added, edited or deleted, AutoByteus picks it up within a few seconds. This includes changes made by an agent such as the Agent Package Creator, by `git pull`, or by your editor. The Agents, Teams and Orgs pages, `@` mentions, Settings → Agent Packages and other open windows all update.
- **Agents see new definitions right away.** An agent that writes a new agent or team can call `list_available_agents` or `delegate_task` for it immediately.
- **A broken edit no longer breaks the definition.** If a definition file becomes invalid, for example half-written JSON, the last working version stays in use. Its card shows **Using last working version**. Expand it to see the file and the reason. The badge clears when the file is fixed.
  - Problems in a Team's own agents show on the **Team card**.
  - Problems in an Org's agents and teams show on the **Org card**.
- **Definitions that cannot be used are listed.** A new definition that is invalid from the start appears in a notice at the top of the Agents, Teams or Orgs page, with its file and reason.
- **Package rows show their auto-refresh state** in Settings → Agent Packages:
  - **Auto-refreshing**: changes are picked up automatically.
  - **Folder not found**: the folder was moved or deleted. Its definitions keep working on their last loaded version, and auto-refresh resumes when the folder is back.
  - **Not auto-refreshing**: watching failed, for example because a folder is unreadable or a system watch limit was reached. The reason is shown. Use **Reload** after edits.

## Changed
- **Reload** on the Agents, Teams and Orgs pages and on package rows is now a fallback. It also updates other open windows. Orgs Reload now rescans the package folders on the server.
- A Team or Org whose ID exists in more than one package is now unavailable everywhere. It was already blocked from launching. Now it is also not offered in `@` or by `list_available_agents`, and the Teams or Orgs page shows why.
- One invalid agent file no longer hides every agent until the next Reload.

## Notes
- Skills are not watched. Skill edits are read by new runs as before.
- GitHub packages still update only when you click **Update**. Nothing is downloaded in the background.
- Running agents keep the definition they started with. New and restored runs use the current one.
- No data migration or reset is needed.
