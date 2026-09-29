---
name: autobyteus-isolated-app
description: Start, list, stop and restart isolated AutoByteus desktop instances (own port, own data, never touching production data) for tutorial recording, screenshots, or testing a source build in the real app. Use together with the browser-automation skill, which controls, screenshots and records the instance window.
---

# AutoByteus Isolated App

This skill covers only the instance lifecycle. To observe, click, type, screenshot or record the
instance, use the **browser-automation** skill (its `SKILL.md` documents the presentation helper
`__abDemo` and `start-recording`/`stop-recording`).

The full guide is `docs/isolated-app-instances.md` in this repository.

## Locate the command

The repository root is the directory two levels above this `SKILL.md`
(`<root>/skills/autobyteus-isolated-app/SKILL.md`). Run the lifecycle from your task workspace with
`pnpm --dir <root> isolated-app <command>`. The repository must have had `pnpm install`.

Every command prints one JSON value: `{"schemaVersion":1,"ok":true,"command":"…","result":{…}}` or
`{"ok":false,"error":{"code":"…","message":"…"}}`. Exit codes: 0 ok, 2 usage, 3 environment,
4 instance not found, 5 operation failure.

## Workflow

1. **Start.** `pnpm --dir <root> isolated-app start` uses the installed app (macOS). Alternatives:
   `--app <path to .app or executable>`, `--from-worktree` (this worktree's packaged build), or
   `--build` (build it first; several minutes). Keep from the result: `instanceId`, `controlPort`
   (default 9333), `databaseUrl`, `logPath`.
   - The installed app gets full isolation of its server settings and no update toasts only if it
     is newer than 1.4.91-beta.4. Older installs inherit your shell's AutoByteus settings. In that
     case use `--from-worktree`/`--build` when running inside AutoByteus.
2. **Control.** Run the browser-automation launcher with the instance's control port and
   attach-only mode, for example
   `env CHROME_REMOTE_DEBUGGING_PORT=9333 BROWSER_AUTOMATION_ATTACH_ONLY=1 bash "<browser launcher>" list-tabs`.
   The instance window is the tab whose URL contains `/renderer/index.html`. Use its `tab_id` for
   `dom-snapshot`, `run-script` (with `__abDemo`), `screenshot`, `start-recording` and
   `stop-recording`.
3. **Prepare content** through the instance UI (agent packages, demo agents); there is no import
   command.
4. **Model access** (only when the user gave you a key source file): run the unchanged importer
   against the instance database. It asks for `IMPORT` in a terminal; `script` provides one. On
   macOS: `script -q /dev/null pnpm --dir <root> secrets:import -- --source <absolute key file> --database-url "<databaseUrl>"`.
   On Linux: `script -qc "pnpm --dir <root> secrets:import -- --source <file> --database-url '<databaseUrl>'" /dev/null`.
   Then run `pnpm --dir <root> isolated-app restart`. Never point the importer at the production
   database.
5. **Restart** with `pnpm --dir <root> isolated-app restart [<instanceId>]`. It keeps the id, ports,
   data root and ownership. The window gets a new tab id, so run `list-tabs` again; a recording of
   the old tab ends with `end_reason: target_closed`.
6. **Stop** with `pnpm --dir <root> isolated-app stop [<instanceId>] [--keep]`. It ends the whole
   instance and deletes the auto-created data root unless `--keep` is given. A root you passed with
   `--data-root` is never deleted. Stopping an instance finalizes any recording of it.

`pnpm --dir <root> isolated-app list` shows recorded instances with `running`. The id may be
omitted when exactly one instance is recorded.

## Recovery

- `CONTROL_PORT_IN_USE`: another instance (named in the message) or program holds the port. Stop
  it, or start with `--control-port <n>` and use the same port for browser-automation.
- `APP_NOT_FOUND`: pass `--app` or use `--from-worktree`/`--build`. Linux has no default install.
- `APP_EXITED_BEFORE_READY`, `READINESS_TIMEOUT`: read the log lines in the message. Nothing
  is left running.
- `INSTANCE_ID_REQUIRED`: several instances exist; pass one of the listed ids.
- `STOP_UNCONFIRMED`: retry `stop`; the record is kept.

## Rules

- Never stop, restart or signal the main AutoByteus app. Only use `isolated-app stop` on instance
  ids that this command reported.
- Never pass a production directory as `--data-root`, and never import keys into a production
  database.
- Stop instances you started when the task is done, unless the user wants them kept.
