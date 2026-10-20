# Isolated AutoByteus Instances: Launch, Control, Screenshot, Record

This guide is for agents and humans who need a second, disposable AutoByteus desktop app next to
the one they use every day. Typical uses are recording tutorial videos, testing a source change in
the real desktop app, and taking screenshots for documentation.

To decide whether an isolated instance is the right test path for a change, see the workspace
testing guideline [TESTING.md](../TESTING.md).

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
| No update checks, prompts or update errors | The instance answers update requests with a quiet `disabled` state, unless you start it with `--test-update-feed` |
| Control endpoint on loopback only | Chromium remote debugging on `127.0.0.1:<control port>` (a free port unless `--control-port` is given) |
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
# Installed app (macOS default), free control and server ports, auto-created data root
pnpm --dir <repo> isolated-app start

# A specific app: an .app bundle or an executable
pnpm --dir <repo> isolated-app start --app /Applications/AutoByteus.app

# The packaged build of this worktree (autobyteus-web/electron-dist); add --build to build it first
pnpm --dir <repo> isolated-app start --from-worktree
pnpm --dir <repo> isolated-app start --build

# Options
#   --control-port <n>   CDP control port (default: a free port; an explicit busy port fails)
#   --server-port <n>    backend port (default: a free port)
#   --data-root <path>   use an existing directory you own; it is never deleted
#   --keep               keep the auto-created data root when the instance stops
#   --test-update-feed <url>  check this local test update feed for app updates
```

`--test-update-feed http://127.0.0.1:<port>` (or `http://localhost:<port>`, an optional path
allowed) makes the instance check that feed for its own update instead of staying quiet, so the
app update notification, Download and Install and restart can be verified without your data. The
feed is an electron-updater generic feed: serve the update metadata electron-updater reads for
the platform (for example `latest-mac.yml`) and the artifacts it names. The startup check runs 8 seconds after launch. The
Release page link is omitted under a test feed. `restart` keeps the option; without it, the
instance keeps the quiet `disabled` update state.

Relative `--app`/`--data-root` paths resolve against the directory you ran `pnpm` from. On Linux
there is no standard install location, so pass `--app` or use `--from-worktree`. `--build` runs
`pnpm build:electron:mac` or `pnpm build:electron:linux` in `autobyteus-web` (several minutes; build
output goes to stderr). A build failure launches nothing.

`start` waits until the backend answers `/rest/health` and the main window is listed on the control
port. Readiness takes a few seconds for the installed app and times out after 120 s. The result
reports the ports that were chosen; keep `instanceId` and `controlPort` for all later steps:

```json
{
  "instanceId": "iso-53817-4049",
  "pid": 69631,
  "executablePath": "/Applications/AutoByteus.app/Contents/MacOS/AutoByteus",
  "backendUrl": "http://127.0.0.1:62342",
  "graphqlUrl": "http://127.0.0.1:62342/graphql",
  "controlEndpoint": "http://127.0.0.1:53817",
  "controlPort": 53817,
  "serverPort": 62342,
  "dataRoot": "/private/var/folders/…/T/autobyteus-isolated-root-qNap5v",
  "ownsDataRoot": true,
  "keepDataRoot": false,
  "databaseUrl": "file:/private/var/folders/…/autobyteus-isolated-root-qNap5v/server-data/db/production.db",
  "logPath": "/var/folders/…/T/autobyteus-isolated-app/iso-53817-4049.log"
}
```

If start fails after launching, the instance is closed, its auto-created data root and record
are removed, and the error message contains the last 40 log lines.

### List, stop, restart

```bash
pnpm --dir <repo> isolated-app list                    # records with "running": true|false
pnpm --dir <repo> isolated-app stop <instanceId> [--keep]
pnpm --dir <repo> isolated-app restart <instanceId>
```

Pass the `instanceId` your `start` reported. The id may be omitted only when exactly one instance
is recorded; when other people's instances may exist, always pass it.

- `stop` checks that the recorded process is still this instance, closes its whole process group
  (graceful, then forced) and reports `wasRunning`, `forced`, `dataRootRemoved`, and whether both
  ports are free again. An auto-created data root is deleted unless `--keep` was given at start or
  stop. A `--data-root` you provided is never deleted. If you already quit the app yourself, `stop`
  sends no signal, still applies the data-root rule and removes the record (`wasRunning: false`).
- `restart` stops the instance but keeps its data root. It then starts the same app again on the same
  ports with the same data root and ownership flags, under the same instance id. The main window
  gets a **new tab id**, so run `list-tabs` again afterwards.

Records and logs live in `<OS temp dir>/autobyteus-isolated-app/`.

### Parallel instances

Several engineers, agents or worktrees can run instances at the same time. Each `start` without
`--control-port` gets its own free control port (and server port), so parallel starts do not
collide. `list` shows every recorded instance on the machine, not only yours. Use the `controlPort`
and `instanceId` from your own `start` result, and never stop or restart an instance you did not
start.

## Connect and control

Point browser-automation at your instance's `controlPort` and switch on attach-only. Attach-only never launches
a browser: if the instance is not running, commands fail with `BROWSER_UNAVAILABLE` (exit 3) naming
the endpoint.

Agents (skill + CLI, the primary path) resolve `scripts/browser` from the browser-automation
`SKILL.md` and run it from their task workspace:

```bash
env CHROME_REMOTE_DEBUGGING_PORT=<controlPort> BROWSER_AUTOMATION_ATTACH_ONLY=1 bash "<browser launcher>" list-tabs
env CHROME_REMOTE_DEBUGGING_PORT=<controlPort> BROWSER_AUTOMATION_ATTACH_ONLY=1 bash "<browser launcher>" dom-snapshot --tab-id "$TAB_ID"
```

MCP clients configure the server with the same two variables. The configuration is fixed to one
instance's port, so update it after each new `start` (a `restart` keeps the port):

```json
{
  "mcpServers": {
    "browser": {
      "command": "/absolute/path/to/autobyteus-mcps/browser-automation/scripts/browser-mcp",
      "env": { "CHROME_REMOTE_DEBUGGING_PORT": "<controlPort>", "BROWSER_AUTOMATION_ATTACH_ONLY": "1" }
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

### Page dialogs

Some AutoByteus actions ask for confirmation with a native `confirm()` (for example removing a node).
Pass the answer with the action: `run-script … --dialog accept` or `--dialog dismiss`.
(`--prompt-text` answers a `prompt` in browsers; the Electron app has no `window.prompt()`.) Without it the dialog is dismissed so the app is not left blocked,
and the command fails with `DIALOG_DECISION_REQUIRED` showing the question. Decide, then repeat
the action with `--dialog`. `alert`s are closed and reported. A dialog left open (for example
raised between commands) must be answered in the window. Until then commands fail with
`PAGE_BLOCKED`. Details are in the browser-automation `SKILL.md`.

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
- A dialog raised by a command during a recording is handled by that command (see "Page dialogs").
  One raised between commands stays open for the app or a person; until it is answered, commands
  fail with `PAGE_BLOCKED`.
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
  pnpm --dir <repo> isolated-app restart <instanceId>
  ```

  `--dry-run` previews the import first. The lifecycle command never imports keys and never reads
  your production vault. See [secret management](../autobyteus-server-ts/docs/modules/secret_management.md).

## Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| `CONTROL_PORT_IN_USE` | Only with an explicit `--control-port`: another instance (named in the message) or program uses that port. Omit `--control-port` to get a free port, or pass another port. Do not stop an instance you did not start. |
| `APP_NOT_FOUND` | No installed app (or Linux). Pass `--app` or use `--from-worktree`/`--build`. |
| `APP_ISOLATION_UNSUPPORTED` | The app build (named in the message) has no isolated-launch support: its resources lack a valid `isolated-launch.json`. Use `--from-worktree`/`--build`, or update the installed app to a release with isolated-launch support. |
| `APPIMAGE_EXTRACTION_REQUIRED` | `--app` points at a packed AppImage. Run `<file>.AppImage --appimage-extract` in a directory you choose, then `start --app <that directory>/squashfs-root/autobyteus` (the extracted executable), or use `--from-worktree`/`--build`. |
| `APP_EXITED_BEFORE_READY` / `READINESS_TIMEOUT` | Read the log lines in the message or `logPath`. A rejected `--data-root` (overlapping production paths, symlink, missing) is reported there. |
| `bad option: --remote-debugging-port` when launching by hand | The shell inherited `ELECTRON_RUN_AS_NODE=1`. `pnpm isolated-app` removes it; for manual launches use `env -u ELECTRON_RUN_AS_NODE …`. |
| `BROWSER_UNAVAILABLE` from browser-automation | Nothing listens on the configured port: the instance stopped, or `CHROME_REMOTE_DEBUGGING_PORT` differs from `controlPort`. |
| `TAB_NOT_FOUND` after `restart` | Tab ids change on restart; run `list-tabs` again. |
| `PAGE_BLOCKED` from browser-automation | A page dialog is open (or a page hangs); answer it in the window, then retry. |
| `DIALOG_DECISION_REQUIRED` | The action raised a `confirm`/`prompt`; repeat it with `--dialog accept` or `--dialog dismiss`. |
| `STOP_UNCONFIRMED` | The process group did not end; the record is kept so `stop` can be retried. |

## Linux

### Choose setup for the environment

| Environment | Setup to use |
| --- | --- |
| Normal Linux host desktop with a graphical session | Use the existing display and normal non-root account with an isolated current worktree build. Xvfb and a numeric UID/GID switch are not required. |
| Headless Linux worker/container without a graphical session | Use the headless build/Xvfb recipe below; keep the display alive for the whole automation session. |
| Root-only Linux container | Build as the owner, then use the root-container recipe to run Electron non-root. Add Xvfb only if there is no usable owned graphical session. |
| Other supported host platforms | Use their platform-specific build/launch instructions, not these Linux apt/Xvfb/setpriv recipes. |

The headless/root-container method was exercised in an Ubuntu 24.04 ARM64
container. It is reusable setup guidance for matching environments, not a
universal host-desktop procedure or proof for every distribution/architecture.
All environments still need test-owned data/ports, current-build evidence,
sandbox preservation and owned-instance cleanup.

Use a native Linux build and an unprivileged runtime user. The unpacked worktree
path supports a real graphical session or an owned Xvfb display; no installed app,
Docker socket, FUSE mount or user-operated desktop is needed for that path.
Distribution/kernel/container policies still determine whether Chromium's sandbox
can start. Validate the actual environment rather than inferring Linux success
from macOS or a browser probe.

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

### Linux preflight and dependencies

Before building/launching, record platform/architecture and runtime identity:

~~~bash
node -p 'process.platform + "-" + process.arch'
id
# Only when using the headless/Xvfb recipe:
command -v Xvfb xvfb-run xauth
# Run this as the intended NON-ROOT application user, not only as the builder:
unshare --user --map-root-user true
~~~

The namespace probe is a diagnostic, not a sandbox override or a complete launch
test. Inspect the actual isolated launch log on failure. Do not change sysctls,
AppArmor/container security policy or sandbox-helper privileges automatically.

For Ubuntu 24.04 containers, an authorized environment owner can install the
virtual-display tools with:

~~~bash
apt-get update
apt-get install -y --no-install-recommends xvfb xauth
# Optional, only when recording is needed:
apt-get install -y --no-install-recommends ffmpeg
~~~

The Electron binary must also have its shared-library dependencies. If launch
reports a missing library, run ldd on the unpacked executable and install the
matching distribution package; do not replace the app with headless Chrome.
Node 22/pnpm 10 and native-architecture workspace dependencies are required.
When pnpm is not on PATH, a test-owned Corepack shim is sufficient:

~~~bash
test -n "$OWN" || OWN=$(mktemp -d)
mkdir -p "$OWN/bin"
corepack enable --install-directory "$OWN/bin"
export PATH="$OWN/bin:$PATH"
~~~

### Build and run in a headless Linux session

Run from the assigned worktree. Build once before launching, serially with any
other build/dev server in that worktree:

~~~bash
pnpm install --frozen-lockfile
pnpm -C autobyteus-web build:electron:linux
~~~

This produces both the AppImage and the unpacked native package. The isolated
launcher discovers the unpacked output with --from-worktree; extraction/FUSE is
not needed for a worktree build. A build downloads native tooling and may take
several minutes. It does not publish a release.

For a non-root worker with write access to its own directories, put the complete
ticket-owned automation session inside Xvfb:

~~~bash
OWN=$(mktemp -d)
mkdir -p "$OWN/home" "$OWN/tmp" "$OWN/runtime"
chmod 700 "$OWN/home" "$OWN/tmp" "$OWN/runtime"
env -i PATH="$PATH" HOME="$OWN/home" TMPDIR="$OWN/tmp" \
  XDG_RUNTIME_DIR="$OWN/runtime" LANG=C.UTF-8 \
  xvfb-run -a -e "$OWN/tmp/xvfb.log" \
    -s "-screen 0 1600x1100x24 -nolisten tcp" \
    node <ticket-owned-probe.mjs> <probe-specific-arguments>
~~~

Replace placeholders with the ticket's automation file and its documented
arguments, including a fresh owned evidence directory. This setup does not
require adding a feature-specific package command or permanent shared probe.
The automation must own isolated start, actual UI assertions, canonical stop/list
and its fixtures. Use --from-worktree only after a current build of the **same
worktree**. Confirm the cleanup receipt before removing $OWN; preserve evidence
outside that temp root. A failed/partial run is not a pass.

**Do not run xvfb-run around isolated-app start as a standalone command and then
exit it.** The launcher returns once ready; that wrapper would stop Xvfb while the
detached app still needs its display. Keep manual start/control/stop in one
long-lived Xvfb session, or wrap the entire owning probe as above.

### Root-only containers

Do not launch Electron as uid 0, and do not add sandbox-disabling flags.

1. Build as the worktree owner (root may build).
2. Allocate a test-owned unprivileged UID/GID, private HOME/TMPDIR/runtime and
   evidence directory. Give that identity read/execute access to the current
   package and write access only to its owned runtime/output directories.
   Never reuse the user's home or change shared/production directory permissions.
3. Launch the complete Xvfb/probe session under that identity. An existing
   unprivileged worker account is suitable with a fresh private home. A root
   container with setpriv can use a dedicated numeric UID/GID without modifying
   account databases:

Prepare only test-owned directories first (choose an unused numeric UID/GID, or
an existing dedicated worker identity):

~~~bash
test -n "$TEST_UID" || { echo "Set the dedicated unprivileged runtime UID"; exit 1; }
test "$TEST_UID" -gt 0 || { echo "Electron runtime UID must not be root"; exit 1; }
test -n "$TEST_GID" || TEST_GID="$TEST_UID"
OWN=$(mktemp -d)
mkdir -p "$OWN/bin" "$OWN/home" "$OWN/tmp" "$OWN/runtime"
chmod 711 "$OWN"
corepack enable --install-directory "$OWN/bin"
export PATH="$OWN/bin:$PATH"
chown "$TEST_UID:$TEST_GID" "$OWN/home" "$OWN/tmp" "$OWN/runtime"
chmod 700 "$OWN/home" "$OWN/tmp" "$OWN/runtime"
mkdir -p autobyteus-web/test-results
OUT=$(mktemp -d "$PWD/autobyteus-web/test-results/linux-desktop.XXXXXX")
chown "$TEST_UID:$TEST_GID" "$OUT"
~~~

Then run the complete ticket-owned automation; supply "$OUT" through its
documented output-directory argument:

~~~bash
setpriv --reuid="$TEST_UID" --regid="$TEST_GID" --clear-groups \
  env -i PATH="$PATH" HOME="$OWN/home" TMPDIR="$OWN/tmp" \
    XDG_RUNTIME_DIR="$OWN/runtime" LANG=C.UTF-8 \
    xvfb-run -a -e "$OWN/tmp/xvfb.log" \
      -s "-screen 0 1600x1100x24 -nolisten tcp" \
      node <ticket-owned-probe.mjs> <probe-specific-arguments>
~~~

The UID/GID and writable directories must be prepared first; the worktree's build
need not be made writable to the application user. Run all lifecycle commands
under the same private environment so they address the same instance registry.
Use only the returned instanceId/controlPort/serverPort, never example ports.
If interrupted, stop **that instance** through the canonical launcher; do not
kill Electron or X servers globally.

After a run, check: canonical stop confirmed, own instance absent from list, own
ports closed, auto data root removed, fixtures/evidence handled, and the owned
virtual display/socket gone. Existing displays/processes/data stay unchanged.

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

- [TESTING.md](../TESTING.md): the workspace testing guideline
- [Electron packaging, `e2e` launch profile and server environment](../autobyteus-web/docs/electron_packaging.md#packaged-e2e-launch-profile)
- [Packaged Electron E2E test launcher](../autobyteus-web/README.md#packaged-electron-e2e-launches)
- [Secret management and `secrets:import`](../autobyteus-server-ts/docs/modules/secret_management.md)
- [Isolated-app agent skill](../skills/autobyteus-isolated-app/SKILL.md)
- browser-automation `SKILL.md` and `README.md` in the `autobyteus-mcps` repository
