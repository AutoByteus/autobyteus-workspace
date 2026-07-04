## What's New
- Terminal sessions now stay alive while switching away from and back to the Terminal tab in the desktop/workspace right panel.

## Improvements
- The Terminal panel keeps one live in-window session per backend/root-path target, so returning to a previously opened workspace root restores its existing xterm scrollback, WebSocket, and PTY while the window host remains mounted.
- Server-home terminals are treated as their own explicit target instead of drifting to the active workspace.
- Changing the active backend/node binding clears cached terminal entries so old WebSockets close and backend PTYs are released cleanly.

## Fixes
- Fixed Terminal tab switches recreating the frontend terminal session and losing interactive shell state.
