# Files -> Terminal Timing Probe Summary (2026-05-29)

Workspace: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`
Frontend: `http://127.0.0.1:3000/workspace?timingTrace=1`
Backend: `http://127.0.0.1:8000`

## Frontend timing highlights

- Agent-bound workspace context created for workspace `agent_ws_2168e8191679724a362414b52618be3b82b0ef7fcfacc379b39c269325a4480c`.
- Files clicked at `1780061770125`.
- File Explorer live stream first consumer connected at `1780061770132`.
- File Explorer stream connected at `1780061772485` (~2.35 s after Files click).
- Terminal clicked at `1780061774627`.
- File Explorer inactive release started/end logged on frontend at `1780061774628`.
- Terminal mounted at `1780061774629`.
- Terminal xterm welcome line was written at `1780061774634`.
- Terminal WebSocket was created at `1780061774634`.
- Terminal WebSocket `open` fired at `1780061794814`, `elapsedMs=20180.4` after WebSocket creation.
- First terminal output arrived at `1780061795188`, `elapsedMs=20553.8` after WebSocket creation.

## Backend timing highlights

From `runtime-logs/backend-timing-20260529.log`:

```text
FileSystemWatcher start.ready: durationMs=2337, watchedDirectoryCount=1670, watchedEntryCount=9847
FileSystemWatcher stop.begin: 1780061774634
FileSystemWatcher stop.end:   1780061794810, durationMs=20178
TerminalRoute socket.accepted: 1780061794814
IsolatedPtySession start.end: durationMs=248
TerminalHandler firstOutput: 122ms after readLoop began; first PTY stdout 369ms after isolated session start
```

## Preliminary conclusion

The observed “Connected to Workspace Terminal” but late prompt behavior reproduced. The frontend created the Terminal WebSocket immediately after the tab click, but the backend did not accept/process that terminal socket until immediately after `chokidar.close()` completed. In this run, watcher close took ~20.18 s for ~1,670 watched directories / ~9,847 watched entries. Once the backend terminal route actually ran, PTY helper startup was ~250 ms and first shell output was ~0.37 s after isolated PTY start.

So the slow terminal prompt is not primarily PTY startup. It is blocked behind File Explorer watcher shutdown on the shared backend Node process/event loop path.
