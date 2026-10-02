# Release notes — Antigravity linked skills and always-on auto-approve

Status: user-verified 2026-10-02. Merged to `personal` with **no release or
publication** at the user's request. These notes are for the next release that
includes this change.

## Fixes

- **Chat on Antigravity no longer fails with "Failed to prepare agent run".**
  Antigravity now exposes each skill as a single link to its folder, as Codex and
  Claude Code do, instead of copying and checking every file. A skill with a local
  environment (for example `browser-automation` with its Python `.venv`), large files
  or links pointing outside its folder no longer blocks a run.
- **One unusable skill no longer blocks the Daily Assistant.** Agents that load all
  installed skills skip an unusable skill with a warning in the server log and start
  with the rest.
- **Clear errors for named skills.** When an agent names a skill that cannot be used,
  the run does not start, and the chat error now names the skill and the reason (for
  example, "Antigravity could not use skill 'x': its folder no longer exists.").
- **Resume survives a removed skill.** An Antigravity run whose skill folder was later
  deleted or moved resumes without that skill and logs a warning. Runs created by
  earlier versions, which hold copied skills, resume as before.

## Behavior change

- **Antigravity always runs with auto-approve.** In every launch and configuration
  surface (new chat, agent, team, member override, org, run settings, mobile), the
  auto-approve control is shown on and locked for Antigravity, with a short
  explanation. Older saved configs with auto-approve off still launch with
  auto-approve. Other runtimes are unchanged.
- Skill content is no longer frozen at run start for Antigravity. As on Codex and Claude,
  a running or resumed run sees the skill folder's current files.

## Known limits

- Verified against `agy` 1.2.14.
- Existing run folders that hold copied skills are not migrated or cleaned up.
