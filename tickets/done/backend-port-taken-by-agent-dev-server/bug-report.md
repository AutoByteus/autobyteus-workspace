# Bug Report: desktop backend port 29695 taken by a dev server an agent started (it inherited `PORT=29695`)

- Reported: 2026-11-06
- Installed app: AutoByteus 1.5.12-beta.2 (macOS; `/Applications/AutoByteus.app` updated 2026-11-06 04:42 local)
- Severity: High. The desktop app cannot start its backend. **Restart Server** cannot fix it, and the app stays unusable until the user finds and kills another process.
- Status: Root cause confirmed on the live machine (evidence below). Not fixed.
- Related: `tickets/done/backend-port-conflict-20261024` (same symptom on 2026-10-24: a Nuxt process on 29695 answering HTTP 426; its origin was left unexplained); `tickets/done/busy-quit-shutdown-orphan` (FU-002, FU-003).

## 1. What the user sees

The app opens to **Application Error**: "Backend port 29695 is already in use. node (PID 81559)". **Restart Server** fails the same way every time. The technical details say "Health check: Server is starting up...", even though the server is not starting and never will.

## 2. Root cause (confirmed)

The process on the port is not a stray AutoByteus backend. It is the **Vite HMR WebSocket of a Nuxt dev server that an AutoByteus agent started**. It chose 29695 because **AutoByteus put `PORT=29695` in its environment**.

The chain:

1. Electron starts the backend with `PORT=29695` and `SERVER_PORT=29695` in its environment
   (`autobyteus-web/electron/server/serverRuntimeEnv.ts:131-132`).
2. The backend gives its whole `process.env` to agent runtimes. For Claude:
   `buildClaudeSdkSpawnEnvironment(process.env)` (`autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-client.ts:356`).
   Native terminal tools also spread `process.env` (`autobyteus-ts/src/tools/terminal/isolated-pty-bridge-source.ts:51`, `wsl-tmux-session.ts:74`).
   Nothing removes `PORT`.
3. A Claude Agent SDK agent ran `npm run dev --host 0.0.0.0 --port 4601` in
   `~/normy-projects/galavion-design-worktrees/a1-system-frame-20261105` on 2026-11-05 22:09 local.
4. Nuxt 4.4.2's vite-builder chooses the HMR port with get-port-please:
   `getPort({ portRange: [24678, 24698] })` (`@nuxt/vite-builder/dist/index.mjs:998, 1474`).
   **get-port-please tries `process.env.PORT` first**
   (`_port = Number(_userOptions.port ?? process.env.PORT)`; `portsToCheck = [options.port, ...portRange]`).
   So any Nuxt dev server an agent starts tries 29695 first. While the AutoByteus backend holds the port, the dev server falls back to 24678+. Whenever the backend is down (quit, update, Restart Server, crash) and Vite (re)starts, **the dev server takes 29695**.
5. The dev server outlives the backend. Its parent is `launchd` (PPID 1), so it is no longer a descendant of the backend. The backend shutdown sweep (`busy-quit-shutdown-orphan`) only kills recorded descendants, so it does not reach this process.
6. On the next start, `waitForBackendPort` (`autobyteus-web/electron/server/backendPortAvailability.ts:18-31`) waits 5 s, then throws `PortConflictError`.

The exact moment 29695 was taken is **inferred**, not observed. The app was updated to 1.5.12-beta.2 at 04:42 local, the old backend's last log line is from about 06:43 local, and the app was relaunched at 06:44:19 local. Each of these was a window in which the backend did not hold the port. FD number 2278 points to a socket opened long after the process started, which fits a Vite restart.

## 3. Why "Restart Server" can't help

`ServerStatusManager.restartServer()` (`autobyteus-web/electron/server/serverStatusManager.ts:76-101`) does:
`stopServer()` (no managed child, so nothing happens) → `startServer()` → `waitForPortToBeFree(5000)` on the **same fixed port 29695** → `PortConflictError`.

- The port is fixed at build time (`PRODUCTION_EMBEDDED_SERVER_PORT = 29695`, `autobyteus-web/shared/embeddedServerClientEndpoint.ts:2`). It is also baked into the renderer config (`autobyteus-web/nuxt.config.ts:56-64`). There is no fallback port.
- The app deliberately never kills a port owner it doesn't manage (backend-port-conflict DEC-002), and keeps the fixed port (DEC-003: "automatically changing ports … conceals rather than solves this failure"). DEC-003 was decided when the suspected cause was AutoByteus's own leaked children. It never considered that **AutoByteus itself steers other programs onto its port** through `PORT`.
- So Restart Server repeats the same failing check. It can only succeed after the foreign holder exits. The on-screen text says so, but users can't tell that "node (PID 81559)" is a dev server their own agent started.

## 4. Evidence (captured 2026-11-06 ~07:52 local)

Saved copies in `evidence/`. These are the originals, because the app overwrites them:

- `evidence/app.log`: full copy of `~/.autobyteus/logs/app.log`. It covers the failed start at 05:44Z, the two Restart Server attempts and the health polling. The app empties this file on every launch.
- `evidence/server-last-session.log`: the last backend session from `~/.autobyteus/server-data/logs/server.log` (started 2026-11-05 08:43Z, PID 55993; no shutdown lines logged).
- `evidence/port-holder-snapshot.txt`: lsof, the process chain, selected environment and the vite-hmr probe of the port holder, captured 07:05Z. Tokens are left out.

```
$ lsof -nP -iTCP:29695
node    81559 normy 2278u  IPv6 ...  TCP *:29695 (LISTEN)

$ ps -o pid,ppid,lstart,command -p 81559
81559 81541 Thu 5 Nov 22:09:12 2026  node .../a1-system-frame-20261105/node_modules/.bin/nuxt dev --host 0.0.0.0 --port 4601
$ ps -o pid,ppid,command -p 81541
81541     1 npm run dev --host 0.0.0.0 --port 4601          # orphaned, parent = launchd

$ curl -i http://127.0.0.1:29695/                          → HTTP/1.1 426 Upgrade Required
$ curl -i -H 'Upgrade: websocket' ... -H 'Sec-WebSocket-Protocol: vite-hmr'
                                                           → 101 Switching Protocols, Sec-WebSocket-Protocol: vite-hmr

Environment of PID 81559 (ps eww), selected:
PORT=29695
AUTOBYTEUS_SERVER_HOST=http://127.0.0.1:29695
AUTOBYTEUS_DATA_DIR=/Users/normy/.autobyteus/server-data
AUTOBYTEUS_DESKTOP_EMBEDDED_NODE=1
CLAUDE_AGENT_SDK_VERSION=0.3.280
CLAUDE_CODE_ENTRYPOINT=sdk-ts
CLAUDE_PID=81385                                           # that Claude process is gone
```

`~/.autobyteus/logs/app.log`:

```
05:44:21Z ServerStatusManager: Starting internal server
05:44:26Z Failed to start server: PortConflictError: Backend port 29695 is in use
          at waitForBackendPort (backendPortAvailability.js:82)
          at MacOSServerManager.waitForPortToBeFree (baseServerManager.js:74)
06:49:22Z / 06:49:39Z  Restarting server → same PortConflictError (x2)
then:     "ServerStatusManager: Checking server health" every 2 s, indefinitely
```

The 2026-10-24 incident (`backend-port-conflict-20261024/investigation-notes.md:14`) matches exactly: "Nuxt PID 84942 on 29695 and HTTP 426". This is a recurring, deterministic mechanism, not a coincidence.

## 5. Reproduction

1. Run the desktop app (backend on 29695).
2. Have an agent (Claude runtime, or the native terminal) start any Nuxt 3/4 dev server in the background (`npm run dev`), or anything else that reads `PORT` (Nuxt/Nitro, Next, Express templates, `serve`, …).
3. Make the agent's process outlive its session (background process, or the agent session ends), so it is reparented to launchd.
4. Quit or restart the app or backend. Within the gap, trigger a Vite restart in the dev server (for example, touch `nuxt.config.ts`). The HMR socket binds 29695.
5. Relaunch the app or press **Restart Server** → "Backend port 29695 is already in use".

Faster check of the mechanism alone (not yet run; it follows from the get-port-please code above): `PORT=29695 npx nuxi dev` with AutoByteus stopped. The HMR socket should land on 29695. Steps 2–5 have not been replayed end to end either. The live evidence in §4 is the confirmation.

## 6. Secondary issues seen in the same incident

- **S1. Misleading health text.** In ERROR state, "Check Server Health" shows "Server is starting up..."
  (`autobyteus-web/stores/serverStore.ts:377`, from `checkServerHealth` returning `status: 'starting'` whenever `!isRunning()`,
  `electron/server/serverStatusManager.ts:110-116`). It should say the server is stopped because of the error.
- **S2. Endless health polling in ERROR state.** It runs every 2 s (log above) with no backoff and no stop.
- **S3. The diagnostic omits what would identify the holder.** It shows "node (PID 81559)" only (DEC-002 hides arguments by default). In this case the holder carries AutoByteus env markers (`AUTOBYTEUS_DATA_DIR`, `AUTOBYTEUS_DESKTOP_EMBEDDED_NODE=1`). The app could safely say "this process was started by an AutoByteus agent (cwd …/a1-system-frame-20261105)" without granting kill authority.

## 7. Suggested fixes (for design; not decided)

1. **Stop leaking the port (primary, small, fixes the cause).** Do not let `PORT` / `SERVER_PORT` (and probably `HOST`) reach agent runtimes and tool shells. Either strip them when building runtime and terminal environments, or pass the backend its port another way (CLI arg, or an `AUTOBYTEUS_`-prefixed variable) and strip `PORT` right after the server reads it. Agent-started dev servers would then fall back to their own defaults (Nuxt HMR 24678+, app 3000).
2. **Keep the backend from releasing the port during restart/update.** Optional hardening; this window is how the dev server got in.
3. **Make the error screen useful when the holder came from AutoByteus.** Detect AutoByteus env markers on the port owner (S3) and offer a clear, confirmed "Stop this agent-started process" action. This stays consistent with DEC-002, because ownership is shown by evidence and not guessed.
4. **Revisit DEC-003 (fixed port) as a product decision.** Possibly a fallback port for the embedded backend, since the renderer endpoint could be supplied at runtime instead of build time. This is larger: phone pairing, remote access and stored node URLs reference 29695.
5. Fix S1/S2 in the renderer and status manager.

## 8. Immediate workaround for the user

Stop the agent-started dev server, then press **Restart Server**:

```
kill 81559 81541        # nuxt dev + its npm parent (galavion a1-system-frame worktree)
```

Restart it from your own terminal (not from an agent) if you still need it, or start it with `PORT` unset: `env -u PORT npm run dev -- --port 4601`.
