# Release Notes — Agents With Skills Start Again on Claude, Codex and Grok

Ships in beta `v1.5.6-beta.4`. Beta tags publish GitHub-generated notes; this file is the curated, user-facing summary.

## Fixed
- Agents with configured skills start again on Claude, Codex and Grok. In v1.5.6-beta.2 and beta.3 they could fail to start.
- A workspace that already links a skill into `.claude/skills`, `.codex/skills` or `.grok/skills` works again. Runs no longer stop with "Workspace skill path collision" when the link points to the same skill.
- Brand-new runs, including team members started for the first time, no longer fail with an `ENOENT` error.
- Skills are exposed the same way as in v1.5.6-beta.1, on every workspace.

## Notes
- If a workspace holds a different skill folder with the same name, an agent with configured skills still refuses to start and names the conflict. An agent that uses all installed skills uses the workspace copy. Both are unchanged from v1.5.6-beta.1.
- Unchanged from v1.5.6-beta.1: when a run ends, the app removes a skill link it used in the workspace, even one you created yourself. The next run creates it again.
- Unchanged from v1.5.6-beta.1: Antigravity still refuses a workspace that has its own `.agents/skills/<name>` for a configured skill.
- Folders left under `runtime-skill-profiles` in agent memory by v1.5.6-beta.2 and beta.3 are no longer used. You can delete them.
