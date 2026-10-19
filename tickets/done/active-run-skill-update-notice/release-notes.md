# Release Notes — Agents Are Told When a Skill They Use Changes

Status: prepared before user verification. Whether this ships in a release, and with which version, is decided at finalization.

## New
- **Running agents learn about skill updates.** When a skill that a running agent uses is edited on disk, for example after you merge a skill change or edit `SKILL.md`, the agent gets one notice. The notice names the skill, the changed files and the current `SKILL.md`, and asks the agent to re-read it before relying on the skill.
  - **Busy agents** get the notice the way they get a message from another agent: inside the current turn on Codex and Claude, and as their next turn on AutoByteus, Antigravity and Grok.
  - **Idle agents are not woken.** The notice arrives together with the next message they receive, in the same turn.
  - **Stopped agents**, including after you restart the app, get the notice with the first message after they continue.
  - If a skill is uninstalled, the notice says it is no longer available.
- The conversation shows the notice as a system notice labelled **Skill updated**. Your own message is shown exactly as you typed it, also in reopened history.

## Notes
- Only skill folders used by current runs are watched, and they are released when no run uses them.
- Changes inside `.git`, `node_modules`, virtual environments, caches, `dist` or `build`, files your skill's `.gitignore` excludes, temporary editor files, and saves with identical content do not trigger a notice.
- A run stores which skill versions it was last given in its memory folder (`seen_skill_versions.json`). No migration or reset is needed.
- Runs started by applications are not covered yet.
