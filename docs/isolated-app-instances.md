# Isolated AutoByteus Instances: Launch, Control, Screenshot, Record

This guide is for agents and humans who need a second, disposable AutoByteus desktop app next to
the one they use every day. Typical uses are recording tutorial videos, testing a source change in
the real desktop app, and taking screenshots for documentation.

The workflow uses two tools:

- **`pnpm isolated-app`** (this repository) starts, lists, stops and restarts isolated instances.
  The agent skill is [`skills/autobyteus-isolated-app/SKILL.md`](../skills/autobyteus-isolated-app/SKILL.md).
- **browser-automation** (the `autobyteus-mcps` repository) drives the instance window. It reads
  the page, acts through `run-script` and its built-in presentation helper, takes screenshots and
  records MP4 video. Its skill is `browser-automation/SKILL.md` in that repository. Agents use its
  bundled CLI launcher `scripts/browser`; the same operations are also available as MCP tools.

## What an isolated instance is

An isolated instance is the normal AutoByteus desktop app started with the existing `e2e` launch
profile (see the [packaging contract](../autobyteus-web/docs/electron_packaging.md#packaged-e2e-launch-profile)).
`pnpm isolated-app start` adds the parts an agent needs:

| Guarantee | How |
| --- | --- |
| Own backend port and own data root | The `e2e` profile; the root is a new private temp directory unless you pass `--data-root` |
| Never reads or writes your production data | The data root must not overlap production paths. The embedded server receives only a system-baseline environment (home, locale, proxy, display, …), so production `AUTOBYTEUS_*`, database and provider settings from the launching shell never reach it. |
| Works from an agent shell | The inherited `ELECTRON_RUN_AS_NODE` is removed for the launch |
| No update checks, prompts or update errors | The instance answers update requests with a quiet `disabled` state |
| Control endpoint on loopback only | Chromium remote debugging on `127.0.0.1:<control port>` (default **9333**) |
| Keeps rendering while covered by other windows | Started with `--disable-backgrounding-occluded-windows --disable-renderer-backgrounding` |
| Main app unaffected | Separate ports, data and process group; `stop` ends only the instance's own process group |

> **Isolated-launch support.** The server-environment isolation and the quiet update state are
> implemented inside the desktop app, so only builds that carry them can be launched isolated.
> Such builds ship a marker, `isolated-launch.json`, in their resources. `pnpm isolated-app start`
> and `restart` check it before doing anything else and refuse other builds with
> `APP_ISOLATION_UNSUPPORTED`. Supported builds are a worktree build (`--from-worktree`/`--build`)
> and installed releases published after this change (1.4.91-beta.5 and earlier are refused).
> An app binary cannot be isolated after the fact: launching an older build by hand with the
> `e2e` variables is outside what the product controls, and its server would inherit the
> launching shell's settings.

## Prerequisites

- macOS or Linux with a graphical session (Linux: a real or virtual X11/Wayland display). Windows
  is not supported.
- This repository checked out with `pnpm install` done (Node.js 22, pnpm 10).
- An AutoByteus build with isolated-launch support: the first release after this change, installed
  (macOS: `/Applications` or `~/Applications`) or given with `--app`, or a packaged worktree build
  (`--from-worktree`/`--build`). Linux AppImage releases must be extracted first (see "Linux").
- For control, screenshots and recording: the `autobyteus-mcps` browser-automation skill, `uv`
  (the launcher prepares its environment on first use) and, for recording, `ffmpeg` on `PATH`.

## Start, list, stop, restart

Run the lifecycle command from anywhere with `pnpm --dir <repository root> isolated-app …`. Every
command prints one JSON value on stdout:

```json
{ "schemaVersion": 1, "ok": true, "command": "start", "result": { … } }
{ "schemaVersion": 1, "ok": false, "command": "start", "error": { "code": "CONTROL_PORT_IN_USE", "message": "…" } }
```

Exit codes: `0` ok, `2` usage (`USAGE_ERROR`, `DATA_ROOT_INVALID`, `INSTANCE_ID_REQUIRED`,
`APPIMAGE_EXTRACTION_REQUIRED`), `3` environment (`APP_NOT_FOUND`, `APP_ISOLATION_UNSUPPORTED`,
`CONTROL_PORT_IN_USE`, `SERVER_PORT_IN_USE`, `BUILD_FAILED`, `APP_LAUNCH_FAILED`,
`UNSUPPORTED_PLATFORM`), `4` `INSTANCE_NOT_FOUND`, `5` operation failure
(`READINESS_TIMEOUT`, `APP_EXITED_BEFORE_READY`, `STOP_UNCONFIRMED`).

### Start

```bash
# Installed app (macOS default), control port 9333, auto-created data root
pnpm --dir <repo> isolated-app start

# A specific app: an .app bundle or an executable
pnpm --dir <repo> isolated-app start --app /Applications/AutoByteus.app

# The packaged build of this worktree (autobyteus-web/electron-dist); add --build to build it first
pnpm --dir <repo> isolated-app start --from-worktree
pnpm --dir <repo> isolated-app start --build

# Options
#   --control-port <n>   CDP control port (default 9333; start fails if it is busy)
#   --server-port <n>    backend port (default: a free port)
#   --data-root <path>   use an existing directory you own; it is never deleted
#   --keep               keep the auto-created data root when the instance stops
```

Relative `--app`/`--data-root` paths resolve against the directory you ran `pnpm` from. On Linux
there is no standard install location, so pass `--app` or use `--from-worktree`. `--build` runs
`pnpm build:electron:mac` or `pnpm build:electron:linux` in `autobyteus-web` (several minutes; build
output goes to stderr). A build failure launches nothing.

`start` waits until the backend answers `/rest/health` and the main window is listed on the control
port. Readiness takes a few seconds for the installed app and times out after 120 s. The result:

```json
{
  "instanceId": "iso-9333-4049",
  "pid": 69631,
  "executablePath": "/Applications/AutoByteus.app/Contents/MacOS/AutoByteus",
  "backendUrl": "http://127.0.0.1:62342",
  "graphqlUrl": "http://127.0.0.1:62342/graphql",
  "controlEndpoint": "http://127.0.0.1:9333",
  "controlPort": 9333,
  "serverPort": 62342,
  "dataRoot": "/private/var/folders/…/T/autobyteus-isolated-root-qNap5v",
  "ownsDataRoot": true,
  "keepDataRoot": false,
  "databaseUrl": "file:/private/var/folders/…/autobyteus-isolated-root-qNap5v/server-data/db/production.db",
  "logPath": "/var/folders/…/T/autobyteus-isolated-app/iso-9333-4049.log"
}
```

If start fails after launching, the instance is closed, its auto-created data root and record
are removed, and the error message contains the last 40 log lines.

### List, stop, restart

```bash
pnpm --dir <repo> isolated-app list                    # records with "running": true|false
pnpm --dir <repo> isolated-app stop [<instanceId>] [--keep]
pnpm --dir <repo> isolated-app restart [<instanceId>]
```

The id may be omitted when exactly one instance is recorded. Several instances can run at once on
different control ports.

- `stop` checks that the recorded process is still this instance, closes its whole process group
  (graceful, then forced) and reports `wasRunning`, `forced`, `dataRootRemoved`, and whether both
  ports are free again. An auto-created data root is deleted unless `--keep` was given at start or
  stop. A `--data-root` you provided is never deleted. If you already quit the app yourself, `stop`
  sends no signal, still applies the data-root rule and removes the record (`wasRunning: false`).
- `restart` stops the instance but keeps its data root. It then starts the same app again on the same
  ports with the same data root and ownership flags, under the same instance id. The main window
  gets a **new tab id**, so run `list-tabs` again afterwards.

Records and logs live in `<OS temp dir>/autobyteus-isolated-app/`.

## Connect and control

Point browser-automation at the control port and switch on attach-only. Attach-only never launches
a browser: if the instance is not running, commands fail with `BROWSER_UNAVAILABLE` (exit 3) naming
the endpoint.

Agents (skill + CLI, the primary path) resolve `scripts/browser` from the browser-automation
`SKILL.md` and run it from their task workspace:

```bash
env CHROME_REMOTE_DEBUGGING_PORT=9333 BROWSER_AUTOMATION_ATTACH_ONLY=1 bash "<browser launcher>" list-tabs
env CHROME_REMOTE_DEBUGGING_PORT=9333 BROWSER_AUTOMATION_ATTACH_ONLY=1 bash "<browser launcher>" dom-snapshot --tab-id "$TAB_ID"
```

MCP clients configure the server once with the same two variables:

```json
{
  "mcpServers": {
    "browser": {
      "command": "/absolute/path/to/autobyteus-mcps/browser-automation/scripts/browser-mcp",
      "env": { "CHROME_REMOTE_DEBUGGING_PORT": "9333", "BROWSER_AUTOMATION_ATTACH_ONLY": "1" }
    }
  }
}
```

The instance window is one tab (its URL ends in `/renderer/index.html#/…`). Observe with
`dom-snapshot`/`read-page`, act with `run-script`, verify, repeat.

### Acting like a human: the presentation helper

`run-script` includes `__abDemo`. It is installed in the page automatically whenever a script
mentions it, and again after a reload. Targets are `{text: '…'}` or `{selector: '…'}`, with an
optional `nth`:

```bash
bash "<browser launcher>" run-script --tab-id "$TAB_ID" --script 'async () => {
  await __abDemo.caption("Create your first agent");
  await __abDemo.click({ text: "Create Agent" });
  await __abDemo.type({ selector: "#agent-name" }, "Research Assistant", { delayMs: 60 });
  return await __abDemo.waitFor({ text: "Saved" }, { timeoutMs: 10000 });
}'
```

It moves a visible cursor to each target, shows a click ripple and types at a visible pace. It also
offers `press`, `hover`, `scroll`, `select`, `highlight`, `hideCaption`, `setPresentation(false)` and
`status()`. Like a person, it only acts on the topmost element: with an in-page popup or modal
open, `click({ text: "Cancel" })` hits the modal's button. Failures return `{ok: false, error: {code}}`
with `NOT_FOUND`, `AMBIGUOUS` (with candidates), `OBSCURED` (matches covered, for example by a
modal; `covering` names the cover), `TIMEOUT`, `NOT_EDITABLE` or `INVALID_TARGET`. The full API is in the browser-automation
`SKILL.md`.

### Screenshots

```bash
bash "<browser launcher>" screenshot --tab-id "$TAB_ID" --output-file shots/agents.png --viewport-only
```

Paths are relative to the caller's workspace; existing files are kept unless `--overwrite` is given.

## Recording video

```bash
bash "<browser launcher>" start-recording --tab-id "$TAB_ID" --output-file tutorial.mp4   # returns at once
# … any number of run-script / screenshot / navigate calls …
bash "<browser launcher>" stop-recording --tab-id "$TAB_ID"
```

`stop-recording` returns `artifact.path` (an H.264 MP4 in the workspace, at the window's pixel size),
`duration_seconds`, `frames` and `end_reason`. The video shows the page with the helper's cursor,
click ripples and captions. No OS screen-recording permission is needed.

- Stopping the instance or closing the tab ends the recording by itself. A later
  `stop-recording` returns it with `end_reason: target_closed`.
- If the agent run that started a recording is cancelled, the recording keeps going. Finish it
  from any later session with `stop-recording` for the same tab, or stop the instance.
- `alert`/`confirm` dialogs raised during a recording stay open for the app or a person. While one
  is open, other browser commands wait until it is answered.
- A second start on the same tab fails with `RECORDING_ALREADY_ACTIVE`, and a stop without a
  recording fails with `RECORDING_NOT_ACTIVE`. A missing `ffmpeg` fails at start with
  `RECORDING_DEPENDENCY_MISSING`.

### Narration and editing

Recording stops at the raw MP4. Use the existing `autobyteus-mcps` servers for post-production:
`tts-mcp` (`speak`) for narration audio, and `video-audio-mcp` to trim, concatenate, and overlay
audio or text onto the clip.

### Whole-screen recording (native dialogs and menus)

Window recording captures only page content. File pickers, OS menus, notifications and other
native surfaces are not included. When a scene needs them, record the screen with ffmpeg instead.
The OS may ask for screen-recording permission.

```bash
# macOS: list devices, then record screen device 1 at 30 fps (stop with q or Ctrl+C)
ffmpeg -f avfoundation -list_devices true -i ""
ffmpeg -f avfoundation -framerate 30 -capture_cursor 1 -i "1:none" -c:v libx264 -pix_fmt yuv420p screen.mp4
# Linux (X11)
ffmpeg -f x11grab -framerate 30 -i "$DISPLAY" -c:v libx264 -pix_fmt yuv420p screen.mp4
```

## Demo content and model access

An isolated instance starts empty.

- **Agent packages and demo data:** create them through the instance UI, like a user would, for
  example with the helper in a scripted scene. There is no lifecycle import command.
- **Provider keys:** credentials are stored in the instance's own encrypted vault. With a key
  source file the user gave you, run the unchanged importer against the reported `databaseUrl`,
  then restart the instance:

  ```bash
  # macOS (script provides the terminal the importer requires; answer IMPORT when asked)
  script -q /dev/null pnpm --dir <repo> secrets:import -- --source /absolute/path/to/keys.env --database-url "<databaseUrl>"
  # Linux
  script -qc "pnpm --dir <repo> secrets:import -- --source /absolute/path/to/keys.env --database-url '<databaseUrl>'" /dev/null
  pnpm --dir <repo> isolated-app restart
  ```

  `--dry-run` previews the import first. The lifecycle command never imports keys and never reads
  your production vault. See [secret management](../autobyteus-server-ts/docs/modules/secret_management.md).

## Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| `CONTROL_PORT_IN_USE` | Another instance (named in the message) or program uses the port. Stop it, or pass `--control-port` and use the same port for browser-automation. |
| `APP_NOT_FOUND` | No installed app (or Linux). Pass `--app` or use `--from-worktree`/`--build`. |
| `APP_ISOLATION_UNSUPPORTED` | The app build (named in the message) has no isolated-launch support: its resources lack a valid `isolated-launch.json`. Use `--from-worktree`/`--build`, or update the installed app to a release with isolated-launch support. |
| `APPIMAGE_EXTRACTION_REQUIRED` | `--app` points at a packed AppImage. Run `<file>.AppImage --appimage-extract` in a directory you choose, then `start --app <that directory>/squashfs-root/autobyteus` (the extracted executable), or use `--from-worktree`/`--build`. |
| `APP_EXITED_BEFORE_READY` / `READINESS_TIMEOUT` | Read the log lines in the message or `logPath`. A rejected `--data-root` (overlapping production paths, symlink, missing) is reported there. |
| `bad option: --remote-debugging-port` when launching by hand | The shell inherited `ELECTRON_RUN_AS_NODE=1`. `pnpm isolated-app` removes it; for manual launches use `env -u ELECTRON_RUN_AS_NODE …`. |
| `BROWSER_UNAVAILABLE` from browser-automation | Nothing listens on the configured port: the instance stopped, or `CHROME_REMOTE_DEBUGGING_PORT` differs from `controlPort`. |
| `TAB_NOT_FOUND` after `restart` | Tab ids change on restart; run `list-tabs` again. |
| Browser command hangs | A page `alert`/`confirm` is open; answer it in the window. |
| `STOP_UNCONFIRMED` | The process group did not end; the record is kept so `stop` can be retried. |

## Linux

Validation of this workflow is macOS-only; Linux is supported on a best-effort basis.

- Release builds ship as an AppImage, which must be extracted before an isolated launch:
  `./AutoByteus_linux-x64-<version>.AppImage --appimage-extract` creates `squashfs-root/`. Then
  run `pnpm --dir <repo> isolated-app start --app <dir>/squashfs-root/autobyteus`. A worktree
  build (`--from-worktree`/`--build`) uses the unpacked output directly.
- A graphical session is required (a real or virtual X11/Wayland display).
- **Chromium sandbox.** Directly launched unpacked or extracted builds use Chromium's sandbox. On
  distributions that restrict unprivileged user namespaces (for example recent Ubuntu with
  AppArmor), the app can fail at startup with a sandbox error in the log. `pnpm isolated-app`
  never disables the sandbox (no `--no-sandbox`, no argument pass-through). The fix is an
  OS-level choice that **you decide**:
  - allow unprivileged user namespaces, e.g. `sudo sysctl -w kernel.apparmor_restrict_unprivileged_userns=0`
    (or `kernel.unprivileged_userns_clone=1` on kernels that use it), or add an AppArmor profile
    that grants `userns` to the AutoByteus executable; or
  - make the bundled sandbox helper setuid root:
    `sudo chown root:root <dir>/chrome-sandbox && sudo chmod 4755 <dir>/chrome-sandbox`
    (`<dir>` is the directory containing the executable).

## Limitations

- Native OS surfaces (file dialogs, system menus, notifications) cannot be driven by the helper or
  captured by window recording (use the whole-screen recipe).
- Helper actions dispatch script events. Browser-trusted behaviour that requires real input (for
  example opening native pickers) is not available.
- The in-app browser panel is a separate web contents: window recording of the main tab does not
  include its content, and it is controlled only if it is listed as its own tab.
- Recording the user's own Chrome while its window is covered or minimized can freeze frames. The
  anti-throttling switches apply only to instances started by `pnpm isolated-app`.
- macOS and Linux only.

## Related documentation

- [Electron packaging, `e2e` launch profile and server environment](../autobyteus-web/docs/electron_packaging.md#packaged-e2e-launch-profile)
- [Packaged Electron E2E test launcher](../autobyteus-web/README.md#packaged-electron-e2e-launches)
- [Secret management and `secrets:import`](../autobyteus-server-ts/docs/modules/secret_management.md)
- [Isolated-app agent skill](../skills/autobyteus-isolated-app/SKILL.md)
- browser-automation `SKILL.md` and `README.md` in the `autobyteus-mcps` repository
